import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';
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
      <ScreenLayout className="items-center justify-center px-8">
        <View className="w-16 h-16 rounded-3xl items-center justify-center border bg-zinc-900 border-white/10 mb-5">
          <Ionicons color={colors.primary.start} name="camera-outline" size={28} />
        </View>
        <Text className="text-white text-xl font-black font-display text-center">
          Falta liberar a câmera
        </Text>
        <Text className="text-zinc-400 text-center text-sm mt-2 leading-relaxed">
          A análise acontece toda no aparelho, mas o Android precisa da sua permissão para a tela
          enxergar.
        </Text>
        <TouchableOpacity activeOpacity={0.8} className="mt-6 w-full" onPress={pedirPermissao}>
          <LinearGradient
            className="py-4 rounded-2xl items-center"
            colors={colors.gradients.primary as unknown as readonly [string, string, ...string[]]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
          >
            <Text className="text-white font-black uppercase tracking-widest">Permitir câmera</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScreenLayout>
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
      className="flex-1 bg-background"
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

      <Esqueleto
        altura={quadro.altura}
        largura={quadro.largura}
        lendo={lendo}
        pontos={analise.pontos}
      />

      {/* Cabeçalho: sai da área da câmera para não competir com o esqueleto. */}
      <View className="absolute top-14 left-6 right-6 flex-row items-center justify-between">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/10"
          onPress={() => router.back()}
        >
          <Ionicons color="#fff" name="chevron-back" size={20} />
        </TouchableOpacity>

        <View
          className="px-3 py-1 rounded-md border"
          style={{
            backgroundColor: lendo ? 'rgba(0,201,167,0.15)' : 'rgba(113,113,122,0.15)',
            borderColor: lendo ? 'rgba(0,201,167,0.35)' : 'rgba(113,113,122,0.35)',
          }}
        >
          <Text
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: lendo ? colors.status.success : colors.text.muted }}
          >
            {lendo ? 'Lendo você' : 'Procurando'}
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {/* O contador. É a única coisa que a pessoa olha de longe, agachando. */}
      <View className="absolute top-28 left-0 right-0 items-center">
        <Text className="text-white text-[88px] font-black font-display italic leading-none">
          {movimento?.repeticoes ?? 0}
        </Text>
        <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">
          Repetições
        </Text>
      </View>

      {/* O aviso fica na tela além de ser falado: numa academia barulhenta, ou
          com o aparelho longe, a voz é a metade que não chega. */}
      {aviso !== null && (
        <View className="absolute bottom-36 left-6 right-6 bg-amber-500/15 border border-amber-500/40 px-5 py-4 rounded-2xl">
          <Text className="text-amber-400 text-center font-bold">{aviso}</Text>
        </View>
      )}

      {analise.ultimaFala !== null && aviso === null && (
        <View className="absolute bottom-36 left-0 right-0 items-center">
          <Text className="text-white text-4xl font-black font-display italic uppercase tracking-tight">
            {analise.ultimaFala.replace('.', '')}
          </Text>
        </View>
      )}

      <View className="absolute bottom-12 left-6 right-6">
        <TouchableOpacity activeOpacity={0.8} onPress={analise.reiniciar}>
          <View className="bg-white/10 border border-white/15 rounded-2xl py-4 items-center">
            <Text className="text-white font-black uppercase tracking-widest text-xs">
              Nova série
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
