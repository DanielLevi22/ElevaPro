import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import X from 'lucide-react-native/icons/x';
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/auth';
import {
  CameraPermission,
  CameraRoundButton,
  CameraShade,
  CameraStatusChips,
  InstructionCard,
  useDarkGlass,
} from '@/components/ui/CameraChrome';
import { useCores, useEscala } from '@/shared/design';
import { TechniqueSpikeView } from '../../../../modules/technique-spike';
import { useVoiceCoach } from '../../../hooks/useVoiceCoach';
import { Esqueleto } from '../components/Esqueleto';
import { IntroducaoDaTecnica } from '../components/IntroducaoDaTecnica';
import { useAnaliseDeTecnica } from '../hooks/useAnaliseDeTecnica';
import { useConsentimentoDaTecnica } from '../hooks/useConsentimentoDaTecnica';

/**
 * A tela do aluno (issue #194).
 *
 * A ordem dos portões é a coisa que mais importa aqui, e é a mesma de
 * `aiBodyScan.ts`: **consentimento antes da câmera**. A `TechniqueSpikeView`
 * abre a câmera no `init` do lado nativo, então montá-la para depois perguntar
 * significaria ter processado a imagem de alguém que ainda não autorizou —
 * e isso é tratamento pelo Art. 5°, X, com ou sem armazenamento.
 *
 * **Nada é gravado e nada sai do aparelho.**
 *
 * Os controles sobre a câmera são os do body scan, no kit de vidro (#361).
 */
export function AnaliseDeTecnicaScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const consentimento = useConsentimentoDaTecnica(session?.user?.id ?? null);
  const [permissao, pedirPermissao] = useCameraPermissions();

  if (consentimento.estado !== 'concedido') {
    return (
      <IntroducaoDaTecnica
        erro={consentimento.erro}
        onAutorizar={consentimento.conceder}
        onCancelar={() => router.back()}
      />
    );
  }

  if (!permissao?.granted) {
    return (
      <CameraPermission
        message="Falta liberar a câmera. A análise acontece toda no aparelho, mas o Android precisa da sua permissão para a tela enxergar."
        onAllow={pedirPermissao}
        onClose={router.back}
      />
    );
  }

  return <Analisando />;
}

/**
 * Só monta depois dos dois portões, e é aqui que a câmera abre.
 *
 * Separado do componente acima de propósito: com tudo num só, os hooks da
 * análise rodariam durante a tela de consentimento.
 */
function Analisando() {
  useKeepAwake();

  const router = useRouter();
  const { speak } = useVoiceCoach();
  const falar = useCallback((texto: string) => speak(texto, true), [speak]);
  const analise = useAnaliseDeTecnica(falar);
  const [quadro, setQuadro] = useState({ largura: 0, altura: 0 });

  const movimento = analise.movimento;
  const aviso = movimento?.aviso?.texto ?? null;
  const lendo = movimento?.profundidade !== null && movimento?.profundidade !== undefined;

  return (
    <View
      className="flex-1 bg-black"
      onLayout={(e) =>
        setQuadro({
          largura: e.nativeEvent.layout.width,
          altura: e.nativeEvent.layout.height,
        })
      }
    >
      <TechniqueSpikeView
        onPose={(e) => analise.aoReceberPose(e.nativeEvent)}
        style={{ flex: 1 }}
      />
      <CameraShade />

      <Esqueleto
        altura={quadro.altura}
        largura={quadro.largura}
        lendo={lendo}
        pontos={analise.pontos}
      />

      <SafeAreaView pointerEvents="box-none" className="absolute inset-0" edges={['top', 'bottom']}>
        <View pointerEvents="box-none" className="flex-1 px-[1.125rem] pb-[1.125rem] pt-[0.375rem]">
          {/* Cabeçalho: sai da área da câmera para não competir com o esqueleto. */}
          <View className="flex-row items-center gap-3">
            <CameraRoundButton icon={X} label="Fechar a análise" onPress={router.back} />
            <View className="flex-1 items-center">
              <Text className="text-[0.65625rem] font-extrabold uppercase tracking-[0.18em] text-primary">
                Análise de técnica
              </Text>
              <Text className="mt-px text-[0.9375rem] font-bold text-sobre-imagem">
                Agachamento
              </Text>
            </View>
            <View className="w-[2.375rem]" />
          </View>

          <CameraStatusChips chips={[{ label: lendo ? 'Lendo você' : 'Procurando', ok: lendo }]} />

          {/* O contador. É a única coisa que a pessoa olha de longe, agachando. */}
          <View pointerEvents="none" className="mt-6 items-center">
            <Text className="font-display-black text-[5.5rem] leading-none text-sobre-imagem">
              {movimento?.repeticoes ?? 0}
            </Text>
            <Text className="mt-1 text-[0.65625rem] font-extrabold uppercase tracking-[0.18em] text-primary">
              Repetições
            </Text>
          </View>

          <View pointerEvents="none" className="flex-1" />

          {/* O aviso fica na tela além de ser falado: numa academia barulhenta, ou
              com o aparelho longe, a voz é a metade que não chega. */}
          {aviso !== null && <InstructionCard text={aviso} />}

          {analise.ultimaFala !== null && aviso === null && (
            <Text className="text-center font-display-black text-4xl uppercase tracking-tight text-sobre-imagem">
              {analise.ultimaFala.replace('.', '')}
            </Text>
          )}

          <NovaSerie onPress={analise.reiniciar} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const ICONE_DA_SERIE = 17;

/** Zera o contador, em vidro escuro: a câmera é escura nos dois temas. */
function NovaSerie({ onPress }: { onPress: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      className="mt-4 h-[3.375rem] flex-row items-center justify-center gap-2 rounded-[1.125rem] border"
      style={useDarkGlass()}
    >
      <Ionicons name="refresh" size={escalar(ICONE_DA_SERIE)} color={cores.sobreImagem} />
      <Text className="text-[0.75rem] font-extrabold uppercase tracking-wide text-sobre-imagem">
        Nova série
      </Text>
    </TouchableOpacity>
  );
}
