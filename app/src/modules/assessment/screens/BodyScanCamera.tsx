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

/** Segundos da contagem. Tempo de o aluno largar o aparelho e chegar na marca. */
const CONTAGEM_SEGUNDOS = 10;

const TITULOS: Record<Vista, string> = { front: 'Frente', back: 'Costas', side: 'Lateral' };

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

  const [portao, setPortao] = useState<Portao | null>(null);
  const [estado, setEstado] = useState('preparando');
  const [contagem, setContagem] = useState<number | null>(null);

  /**
   * O nível num ref porque `onFatos` é um callback nativo: lido do estado, ele
   * enxergaria a inclinação de quando a tela montou. O sensor emite 5x por
   * segundo e não deve provocar re-render nenhum.
   */
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;

  /** A última instrução dita. É por ela que a voz não repete a mesma frase. */
  const ultimaFalada = useRef<IdDaInstrucao | null>(null);

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
        ultimaFalada.current
      );

      setPortao(resultado);

      if (resultado.instrucao === null) {
        ultimaFalada.current = null;
        return;
      }

      if (resultado.deveFalar && !vozMuda) speak(resultado.instrucao.texto);
      ultimaFalada.current = resultado.instrucao.id;
    },
    [target, vozMuda, speak]
  );

  const disparar = useCallback(async () => {
    try {
      Vibration.vibrate(50);
      const uri = await camera.current?.capturar();
      if (!uri) return;

      const { setCapturedImage, setCaptureFraming } = useAssessmentStore.getState();
      setCapturedImage(target, uri);
      setCaptureFraming({
        markTop: MARCA_TOPO,
        markBottom: MARCA_BASE,
        pitch: nivelRef.current.pitch,
        roll: nivelRef.current.roll,
        levelSensor: nivelRef.current.disponivel,
        camera: 'back',
      });

      const avisos = portao?.avisos ?? [];
      if (avisos.length > 0) {
        showAlert({
          title: 'Foto registrada, com ressalva',
          message: TEXTO_DO_AVISO[avisos[0]],
          type: 'warning',
        });
      }

      router.back();
    } catch {
      showAlert({ title: 'Erro', message: 'Não consegui tirar a foto', type: 'error' });
    }
  }, [target, portao, router]);

  /**
   * A contagem só anda com o portão aberto.
   *
   * É a transição que o desenho antigo não tinha: antes o temporizador
   * disparava mesmo que o aluno tivesse saído do lugar nos dez segundos.
   */
  useEffect(() => {
    if (contagem === null) return;
    if (!portao?.liberado) return;

    if (contagem <= 0) {
      setContagem(null);
      disparar();
      return;
    }

    Vibration.vibrate(30);
    if (!vozMuda && contagem <= 3) speak(String(contagem));

    const id = setTimeout(() => setContagem((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [contagem, portao?.liberado, vozMuda, speak, disparar]);

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

  const liberado = portao?.liberado ?? false;
  const instrucao = portao?.instrucao ?? null;

  return (
    <View className="flex-1 bg-black">
      <BodyScanPoseView
        ref={camera}
        style={{ flex: 1 }}
        onFatos={aoFatos}
        onEstado={(e) => setEstado(e.nativeEvent.estado)}
      />

      {/* As marcas seguem desenhadas: elas dizem ao aluno para onde ir. O que
          mudou é que agora alguém confere se ele chegou. */}
      <View
        pointerEvents="none"
        className="absolute left-0 right-0"
        style={{ top: `${MARCA_TOPO * 100}%` }}
      >
        <View className={`h-[2px] ${liberado ? 'bg-emerald-400/80' : 'bg-primary/70'}`} />
      </View>
      <View
        pointerEvents="none"
        className="absolute left-0 right-0"
        style={{ top: `${MARCA_BASE * 100}%` }}
      >
        <View className={`h-[2px] ${liberado ? 'bg-emerald-400/80' : 'bg-primary/70'}`} />
      </View>

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

      <TouchableOpacity
        onPress={() => setVozMuda(!vozMuda)}
        className="absolute top-12 right-5 w-12 h-12 rounded-full bg-black/50 border border-white/20 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={vozMuda ? 'Ligar a voz' : 'Desligar a voz'}
      >
        <Ionicons
          name={vozMuda ? 'volume-mute-outline' : 'volume-high-outline'}
          size={22}
          color="white"
        />
      </TouchableOpacity>

      {contagem !== null && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Text className="text-white text-[120px] font-black">{contagem}</Text>
          {!liberado && (
            <Text className="text-amber-300 text-sm font-bold">a contagem espera você</Text>
          )}
        </View>
      )}

      <View className="absolute bottom-12 w-full items-center">
        <TouchableOpacity
          onPress={() => setContagem(CONTAGEM_SEGUNDOS)}
          disabled={contagem !== null}
          className={`w-20 h-20 rounded-full border-4 items-center justify-center ${
            liberado ? 'bg-white border-emerald-400' : 'bg-white/30 border-white/30'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Iniciar a contagem"
        >
          <View className="w-16 h-16 rounded-full border-2 bg-white border-black" />
        </TouchableOpacity>

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
