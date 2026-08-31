import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, Vibration, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { useVoiceCoach } from '@/hooks/useVoiceCoach';
import BodyScanPoseView, {
  type BodyScanPoseRef,
  type FatosDeVisao,
} from '../../../../modules/body-scan-pose';
import { MarcasDoEnquadramento } from '../components/MarcasDoEnquadramento';
import { useDeviceLevel } from '../hooks/useDeviceLevel';
import {
  type AvisoDeQualidade,
  avaliarPortao,
  type IdDaInstrucao,
  type Portao,
  type Vista,
} from '../services/portao';
import { useAssessmentStore } from '../store/assessmentStore';

/**
 * Onde a cabeça e os pés devem ficar, em fração da altura da tela.
 *
 * Continuam sendo as marcas do `ADR-0010`, mas deixaram de ser honra: o portão
 * mede onde o corpo está de fato e só libera o disparo quando ele encaixa.
 */
const MARCA_TOPO = 0.1;
const MARCA_BASE = 0.9;

/**
 * Segundos entre o portão abrir e o disparo.
 *
 * Curto de propósito: o aluno já está na posição quando a contagem começa — ela
 * não é tempo para caminhar, é tempo para parar de se mexer.
 */
const CONTAGEM_SEGUNDOS = 5;

const TITULOS: Record<Vista, string> = { front: 'Frente', back: 'Costas', side: 'Lateral' };

/**
 * Quanto tempo preso antes de oferecer a saída manual.
 *
 * O grilling decidiu liberar depois de tentativas reprovadas, e sem isso um
 * cômodo ruim vira beco sem saída — o mesmo beco que o portão de elegibilidade
 * existe para eliminar, reaparecendo dois passos adiante.
 *
 * A saída é botão e não disparo automático: fotografar um enquadramento ruim
 * sem o aluno saber seria pior que travar.
 */
const ESPERA_ATE_LIBERAR_MS = 45_000;

const TEXTO_DO_AVISO: Record<AvisoDeQualidade, string> = {
  contraluz: 'Você está contra a luz — a análise fica menos precisa.',
  'luz-fraca': 'O cômodo está escuro — a análise fica menos precisa.',
  'luz-estourada': 'A luz está estourando a imagem — a análise fica menos precisa.',
};

export default function BodyScanCamera() {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const camera = useRef<BodyScanPoseRef>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const target = params.target as Vista;

  const nivel = useDeviceLevel();
  const { speak } = useVoiceCoach();
  const vozMuda = useAssessmentStore((s) => s.vozMuda);
  const setVozMuda = useAssessmentStore((s) => s.setVozMuda);
  const lenteFrontal = useAssessmentStore((s) => s.lenteFrontal);
  const ocupacaoDeReferencia = useAssessmentStore((s) => s.ocupacaoDeReferencia);
  const setLenteFrontal = useAssessmentStore((s) => s.setLenteFrontal);

  const [portao, setPortao] = useState<Portao | null>(null);
  const [estado, setEstado] = useState('preparando');
  const [contagem, setContagem] = useState<number | null>(null);

  /**
   * Já avisei que ia fotografar nesta entrada no portão?
   *
   * Sem isto, um portão que pisca reabriria a contagem a cada frame e a voz
   * viraria metralhadora.
   */
  const jaAnunciou = useRef(false);

  /**
   * O nível num ref porque `onFatos` é um callback nativo: lido do estado, ele
   * enxergaria a inclinação de quando a tela montou. O sensor emite 5x por
   * segundo e não deve provocar re-render nenhum.
   */
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;

  /** A última instrução dita. É por ela que a voz não repete a mesma frase. */
  const ultimaFalada = useRef<IdDaInstrucao | null>(null);

  /** O portão estava aberto? Entra na avaliação para dar histerese a ele. */
  const estavaLiberado = useRef(false);

  /** Quando a voz falou pela última vez. Instrução presa volta a ser dita. */
  const instanteDaFala = useRef(0);

  /** Desde quando o portão está fechado sem parar. Zera ao abrir. */
  const fechadoDesde = useRef(Date.now());
  const [ofereceSaida, setOfereceSaida] = useState(false);

  /**
   * `speak` e `disparar` por ref, não por dependência.
   *
   * `speak` chama `setLastInstruction` lá dentro: falar re-renderiza, o
   * re-render cria uma identidade nova da função, e um efeito que dependa dela
   * reroda — cancelando o `setTimeout` da contagem antes de ele completar e
   * falando de novo. Na prática a contagem engasgava no 3, que é o primeiro
   * número que ela pronuncia.
   */
  const falarRef = useRef(speak);
  falarRef.current = speak;

  const aoFatos = useCallback(
    (evento: { nativeEvent: FatosDeVisao }) => {
      const { pitch, roll, disponivel } = nivelRef.current;

      const resultado = avaliarPortao(
        {
          ...evento.nativeEvent,
          vistaPedida: target,
          pitch,
          roll,
          nivelDisponivel: disponivel,
        },
        {
          ultimaFalada: ultimaFalada.current,
          estavaLiberado: estavaLiberado.current,
          msDesdeAFala: Date.now() - instanteDaFala.current,
          ocupacaoAlvo: ocupacaoDeReferencia,
        }
      );

      estavaLiberado.current = resultado.liberado;
      setPortao(resultado);

      if (resultado.liberado) {
        fechadoDesde.current = Date.now();
        setOfereceSaida(false);
      } else if (Date.now() - fechadoDesde.current >= ESPERA_ATE_LIBERAR_MS) {
        setOfereceSaida(true);
      }

      if (resultado.instrucao === null) {
        ultimaFalada.current = null;
        return;
      }

      if (resultado.deveFalar && !vozMuda) {
        falarRef.current(resultado.instrucao.texto);
        instanteDaFala.current = Date.now();
      }
      ultimaFalada.current = resultado.instrucao.id;
    },
    [target, vozMuda, ocupacaoDeReferencia]
  );

  const disparar = useCallback(
    async (semEnquadramento = false) => {
      try {
        Vibration.vibrate(50);
        const uri = await camera.current?.capturar();
        if (!uri) return;

        // Medir vem antes de guardar. Tirar e medir são trabalhos separados —
        // a foto já está no disco e não depende da medida —, mas sem geometria
        // a pose não serve: o `ADR-0022` recusa a foto em vez de deixar a
        // análise cair no método antigo, que reintroduziria dois métodos na
        // mesma série. Guardar primeiro deixaria a foto num meio-estado, válida
        // no store e inútil para a análise.
        const medida = await camera.current?.medir(uri, target === 'side').catch(() => null);

        // Exceção à regra, e deliberada: quem chegou aqui pela saída manual já
        // passou 45s sem conseguir encaixar. Recusar de novo por falta de
        // medida é o beco sem saída que a saída manual existe para evitar. A
        // foto entra sem geometria, e `framing_confirmed: false` registra isso.
        if (!medida && !semEnquadramento) {
          showAlert({
            title: 'Não consegui medir esta foto',
            message:
              'Não achei seu contorno da cabeça aos pés. Confira se está descalço, com o corpo inteiro no quadro, e vamos repetir só esta pose.',
            type: 'warning',
          });
          return;
        }

        const {
          setCapturedImage,
          setCaptureFraming,
          registrarQualidade,
          setMedida,
          setOcupacaoDeReferencia,
        } = useAssessmentStore.getState();
        setCapturedImage(target, uri);
        if (medida) setMedida(target, medida);
        registrarQualidade(portao?.avisos ?? [], !semEnquadramento);

        // A primeira pose do scan fixa a distância, e as duas seguintes têm de
        // repeti-la. Sem isto a frente pode sair a 0.70 de ocupação e a lateral
        // a 0.88, e aí as duas larguras descrevem pontos de vista diferentes em
        // vez do mesmo corpo — que é o que torna a cintura da frente e a da
        // lateral comparáveis entre si (`ADR-0022`).
        if (ocupacaoDeReferencia === null && portao?.ocupacao != null) {
          setOcupacaoDeReferencia(portao.ocupacao);
        }
        setCaptureFraming({
          markTop: MARCA_TOPO,
          markBottom: MARCA_BASE,
          pitch: nivelRef.current.pitch,
          roll: nivelRef.current.roll,
          levelSensor: nivelRef.current.disponivel,
          camera: lenteFrontal ? 'front' : 'back',
        });

        // Foto sem o portão confirmar é foto com ressalva: o aluno é avisado
        // na hora, e `framing_confirmed` leva a mesma informação para quem for
        // ler o scan depois.
        if (semEnquadramento) {
          showAlert({
            title: 'Foto sem enquadramento confirmado',
            message: 'Não consegui verificar sua posição, então a medida pode sair menos precisa.',
            type: 'warning',
            onDismiss: () => router.back(),
          });
          return;
        }

        const avisos = portao?.avisos ?? [];
        if (avisos.length === 0) {
          router.back();
          return;
        }

        // Sai só quando o aluno fecha o aviso. Antes o `router.back()` corria por
        // baixo do alerta, e a tela ficava aberta com a foto já tirada — parecia
        // que o disparo tinha falhado quando tinha dado certo.
        showAlert({
          title: 'Foto registrada, com ressalva',
          message: TEXTO_DO_AVISO[avisos[0]],
          type: 'warning',
          onDismiss: () => router.back(),
        });
      } catch {
        showAlert({ title: 'Erro', message: 'Não consegui tirar a foto', type: 'error' });
      }
    },
    [target, portao, router, lenteFrontal, ocupacaoDeReferencia]
  );

  /**
   * O portão abriu: avisa, pede imobilidade e começa a contar.
   *
   * Ninguém aperta botão. O aparelho está a metros de distância — foi por isso
   * que o temporizador existiu desde o início, e disparar sozinho resolve a
   * causa em vez do sintoma.
   */
  useEffect(() => {
    if (!portao?.liberado) {
      // Saiu da posição: a contagem morre em vez de congelar. "Fique parado" é
      // promessa sobre não se mexer — retomar de onde parou seria mentira.
      jaAnunciou.current = false;
      setContagem(null);
      return;
    }

    if (jaAnunciou.current) return;

    jaAnunciou.current = true;

    // A contagem só começa quando a frase acaba. Correndo por cima dela, o
    // aluno ouvia "cinco segundos" com dois já gastos.
    if (vozMuda) {
      setContagem(CONTAGEM_SEGUNDOS);
      return;
    }

    falarRef.current('Perfeito. Fique parado.', true, () => setContagem(CONTAGEM_SEGUNDOS));
  }, [portao?.liberado, vozMuda]);

  /** Mesma razão do `falarRef`: `disparar` muda de identidade a cada render. */
  const dispararRef = useRef(disparar);
  dispararRef.current = disparar;

  /** Um segundo por vez. Sair da posição zera pelo efeito acima. */
  useEffect(() => {
    if (contagem === null) return;

    if (contagem <= 0) {
      setContagem(null);
      dispararRef.current();
      return;
    }

    Vibration.vibrate(30);
    if (!vozMuda && contagem <= 3) falarRef.current(String(contagem));

    const id = setTimeout(() => setContagem((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [contagem, vozMuda]);

  if (!permissao) return <View className="flex-1 bg-black" />;

  if (!permissao.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-black px-8">
        <Text className="text-white text-center mb-6">
          Preciso da câmera para te posicionar e medir o enquadramento.
        </Text>
        <TouchableOpacity
          className="bg-primary px-8 py-4 rounded-full"
          onPress={pedirPermissao}
          accessibilityRole="button"
        >
          <Text className="text-black font-bold">Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const instrucao = portao?.instrucao ?? null;

  return (
    <View className="flex-1 bg-black">
      <BodyScanPoseView
        ref={camera}
        // `key` força a remontagem: trocar de lente exige religar o CameraX no
        // outro sensor, e a view guarda o `ImageCapture` da vinculação atual.
        key={lenteFrontal ? 'frontal' : 'traseira'}
        lenteFrontal={lenteFrontal}
        style={{ flex: 1 }}
        onFatos={aoFatos}
        onEstado={(e) => setEstado(e.nativeEvent.estado)}
      />

      <MarcasDoEnquadramento
        topo={MARCA_TOPO}
        base={MARCA_BASE}
        proximidade={portao?.proximidade ?? 'longe'}
      />

      <View className="absolute top-12 left-0 right-0 items-center px-6">
        <View className="bg-black/50 px-6 py-3 rounded-full border border-white/20">
          <Text className="text-white font-bold text-lg">{TITULOS[target] ?? 'Foto'}</Text>
        </View>

        {/* Uma instrução por vez. Silêncio — aqui, ausência de caixa — significa
            que está bom, e é informação tanto quanto a frase. */}
        {instrucao !== null && (
          <View className="mt-4 bg-amber-500/20 border border-amber-500/40 px-5 py-3 rounded-2xl">
            <Text className="text-amber-200 text-sm font-bold text-center">{instrucao.texto}</Text>
          </View>
        )}

        {portao === null && (
          <Text className="text-white/70 text-xs mt-4 text-center">{estado}</Text>
        )}
      </View>

      <View className="absolute top-12 right-5 gap-3">
        <TouchableOpacity
          onPress={() => setVozMuda(!vozMuda)}
          className="w-12 h-12 rounded-full bg-black/50 border border-white/20 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={vozMuda ? 'Ligar a voz' : 'Desligar a voz'}
        >
          <Ionicons
            name={vozMuda ? 'volume-mute-outline' : 'volume-high-outline'}
            size={22}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setLenteFrontal(!lenteFrontal)}
          disabled={contagem !== null}
          className="w-12 h-12 rounded-full bg-black/50 border border-white/20 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={lenteFrontal ? 'Usar câmera traseira' : 'Usar câmera frontal'}
        >
          <Ionicons name="camera-reverse-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {contagem !== null && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Text className="text-white text-[120px] font-black">{contagem}</Text>
          <Text className="text-emerald-300 text-base font-bold">fique parado</Text>
        </View>
      )}

      <View className="absolute bottom-12 w-full items-center">
        {/* A saída de emergência só aparece depois de a espera se provar longa.
            Antes disso ela seria um convite a pular o portão. */}
        {ofereceSaida && contagem === null && (
          <TouchableOpacity
            onPress={() => disparar(true)}
            className="bg-amber-500/25 border border-amber-500/50 px-6 py-3 rounded-full"
            accessibilityRole="button"
          >
            <Text className="text-amber-200 font-bold">Tirar assim mesmo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="mt-6 bg-black/50 px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
