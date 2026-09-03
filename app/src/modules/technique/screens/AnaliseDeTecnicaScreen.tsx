import { useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
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
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Text className="text-white text-center mb-6">
          Falta liberar a câmera do aparelho para a análise funcionar.
        </Text>
        <TouchableOpacity className="bg-white rounded-lg px-6 py-3" onPress={pedirPermissao}>
          <Text className="text-black font-bold">Permitir câmera</Text>
        </TouchableOpacity>
      </View>
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

  const { speak } = useVoiceCoach();
  const falar = useCallback((texto: string) => speak(texto, true), [speak]);
  const analise = useAnaliseDeTecnica(falar);
  const [quadro, setQuadro] = useState({ largura: 0, altura: 0 });

  const movimento = analise.movimento;
  const aviso = movimento?.aviso?.texto ?? null;

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

      <Esqueleto
        altura={quadro.altura}
        largura={quadro.largura}
        lendo={movimento?.profundidade !== null && movimento?.profundidade !== undefined}
        pontos={analise.pontos}
      />

      <View className="absolute top-16 left-0 right-0 items-center">
        <Text className="text-white text-7xl font-bold tabular-nums">
          {movimento?.repeticoes ?? 0}
        </Text>
        <Text className="text-white/50 text-sm">repetições</Text>
      </View>

      {/* O aviso fica na tela além de ser falado: numa academia barulhenta, ou
          com o aparelho longe, a voz é a metade que não chega. */}
      {aviso !== null && (
        <View className="absolute bottom-40 left-6 right-6 bg-amber-500 rounded-xl px-4 py-3">
          <Text className="text-black text-center font-semibold">{aviso}</Text>
        </View>
      )}

      {analise.ultimaFala !== null && aviso === null && (
        <View className="absolute bottom-40 left-0 right-0 items-center">
          <Text className="text-white text-3xl font-bold">{analise.ultimaFala}</Text>
        </View>
      )}

      <View className="absolute bottom-12 left-0 right-0 items-center">
        <TouchableOpacity
          className="bg-white/15 rounded-full px-8 py-3"
          onPress={analise.reiniciar}
        >
          <Text className="text-white font-semibold">Nova série</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
