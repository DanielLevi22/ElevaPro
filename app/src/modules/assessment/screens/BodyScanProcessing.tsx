import { createHealthService, type EtapaDaAnalise } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { ROUTES } from '@/navigation/types';
import { useAssessmentStore } from '../store/assessmentStore';
import { AssessmentStatus } from '../types/assessment';

/**
 * A frase do aluno e o diagnóstico de quem conserta, com pesos diferentes.
 *
 * `mensagemDeErroBff` devolve as duas no mesmo texto, separadas por linha em
 * branco. Renderizadas juntas e com o mesmo estilo, o aluno lia
 * "java.io.IOException: unexpected end of stream" como se fosse instrução do
 * que ele deveria fazer — e a frase que realmente diz o que fazer se perdia no
 * meio. O bloco `[dev]` só existe em desenvolvimento.
 */
function MensagemDaFalha({ texto }: { texto: string | null }) {
  const [mensagem, ...diagnostico] = (
    texto ?? 'Não consegui completar a análise. Tente de novo.'
  ).split('\n\n');

  return (
    <>
      <Text className="text-zinc-200 text-base text-center mt-4 leading-6">{mensagem}</Text>
      {diagnostico.length > 0 && (
        <View className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <Text className="text-zinc-400 text-xs leading-5">{diagnostico.join('\n\n')}</Text>
        </View>
      )}
    </>
  );
}

/** O que cada etapa do fluxo significa para quem está esperando. */
const TEXTO_DA_ETAPA: Record<EtapaDaAnalise, string> = {
  lendo: 'Lendo as suas três fotos.',
  proporcoes: 'Calculando as proporções do seu corpo.',
  postura: 'Analisando a sua postura.',
  recomendacoes: 'Escrevendo as recomendações.',
};

export default function BodyScanProcessing() {
  const router = useRouter();
  const { capturedImages, submitScan, status, errorMessage, etapaDaAnalise } = useAssessmentStore();
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const process = async () => {
      if (Object.keys(capturedImages).length === 0) {
        // No images? Go back
        router.replace('/assessment/body-scan');
        return;
      }

      await submitScan();

      // A tela navegava para o resultado mesmo quando a análise falhava, e o
      // aluno via um resultado vazio sem saber por quê.
      if (useAssessmentStore.getState().status !== AssessmentStatus.COMPLETED) return;

      if (!mounted) return;

      // O destino é a rota do PRÓPRIO aluno, não a de `(tabs)/students/`, que é
      // a aba do especialista — `href: null` para quem é `student` ou `member`.
      // Mandar o aluno para lá não navegava: a análise terminava com sucesso e
      // ele ficava preso no "Analisando...".
      //
      // Sempre a própria: o BFF usa `authorizeStudent` e deriva o id do token,
      // então não existe escaneamento de terceiro para desviar daqui.
      //
      // Sem `as never`: o cast fazia destino inexistente deixar de ser erro de
      // compilação e virar navegação que não acontece, sem erro e sem log.
      router.replace(ROUTES.STUDENT.POSTURE_ANALYSIS);
    };

    process();

    return () => {
      mounted = false;
    };
  }, [capturedImages, submitScan, router]);

  const handleGrantConsent = async () => {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return;
    setGranting(true);
    try {
      await createHealthService(supabase).grantCollectionConsent(userId);
      await submitScan();
    } finally {
      setGranting(false);
    }
  };

  // Sucesso tem tela própria, e não é luxo: sem ela a única saída daqui é a
  // navegação, e foi assim que uma análise concluída em 14s deixou o aluno
  // preso no "Analisando..." — a rota de destino era de uma aba que ele não
  // tem. Uma tela que só sai por navegação fica presa quando a navegação falha.
  if (status === AssessmentStatus.COMPLETED) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <LinearGradient
          colors={[colors.background.primary, '#1a1a2e', '#000000']}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <Animated.View entering={FadeInUp.springify()} className="items-center">
          <Text className="text-white text-2xl font-black text-center">Análise pronta</Text>
          <Text className="text-zinc-400 text-sm text-center mt-4 leading-relaxed">
            Suas medidas foram calculadas.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace(ROUTES.STUDENT.POSTURE_ANALYSIS)}
            className="mt-8 bg-primary px-8 py-4 rounded-2xl w-full items-center"
          >
            <Text className="text-black font-black uppercase tracking-widest text-xs">
              Ver resultado
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (status === AssessmentStatus.ERROR) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <LinearGradient
          colors={[colors.background.primary, '#1a1a2e', '#000000']}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <Animated.View entering={FadeInUp.springify()} className="items-center">
          <Text className="text-white text-2xl font-black text-center">
            A análise não completou
          </Text>
          <MensagemDaFalha texto={errorMessage} />
          {/* As fotos continuam no store: repetir a captura depois de esperar
              a análise é o que fazia o aluno desistir. */}
          <Text className="text-zinc-400 text-sm text-center mt-4">
            Suas fotos foram mantidas — não precisa tirar de novo.
          </Text>

          <TouchableOpacity
            onPress={() => submitScan()}
            className="mt-8 bg-primary px-8 py-4 rounded-2xl w-full items-center"
          >
            <Text className="text-black font-black uppercase tracking-widest text-xs">
              Tentar de novo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} className="mt-4 py-3">
            <Text className="text-zinc-500 text-xs uppercase tracking-widest">Voltar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (status === AssessmentStatus.NEEDS_CONSENT) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <LinearGradient
          colors={[colors.background.primary, '#1a1a2e', '#000000']}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <Animated.View entering={FadeInUp.springify()} className="items-center">
          <Text className="text-white text-2xl font-black text-center">
            Falta o seu consentimento
          </Text>
          <Text className="text-zinc-400 text-sm text-center mt-4 leading-relaxed">
            Para analisar suas fotos, precisamos da sua autorização para tratar dados de saúde. As
            imagens vão para um serviço de inteligência artificial externo e não são guardadas — só
            o resultado fica salvo.
          </Text>
          <Text className="text-zinc-500 text-xs text-center mt-3">
            Você pode revogar essa autorização quando quiser, no seu perfil.
          </Text>

          <TouchableOpacity
            onPress={handleGrantConsent}
            disabled={granting}
            className="mt-8 bg-primary px-8 py-4 rounded-2xl w-full items-center"
          >
            {granting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black font-black uppercase tracking-widest text-xs">
                Autorizar e analisar
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} className="mt-4 py-3">
            <Text className="text-zinc-500 text-xs uppercase tracking-widest">Agora não</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <LinearGradient
        colors={[colors.background.primary, '#1a1a2e', '#000000']}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      <Animated.View entering={FadeInUp.springify()} className="items-center">
        <View className="w-24 h-24 bg-primary/20 rounded-full items-center justify-center mb-6 border border-primary/40 shadow-[0_0_30px_rgba(255,107,53,0.3)]">
          <ActivityIndicator size="large" color={colors.primary.start} />
        </View>

        <Text className="text-white text-2xl font-black font-display mb-2">Analisando...</Text>
        {/* A etapa vem do fluxo do BFF: é a seção que o modelo acabou de
            escrever. Antes esta linha dizia "construindo seu modelo 3D",
            que não existe — e não mudava nunca, então trinta segundos de
            espera eram indistinguíveis de tela travada. */}
        <Text className="text-zinc-300 text-center px-10 text-base">
          {TEXTO_DA_ETAPA[etapaDaAnalise ?? 'lendo']}
        </Text>
        <Text className="text-zinc-500 text-center px-10 text-xs mt-2">
          Costuma levar cerca de meio minuto.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(500)}
        className="mt-10 flex-row gap-4 flex-wrap justify-center px-6"
      >
        {capturedImages.front && (
          <View className="items-center gap-1">
            <Image
              source={{ uri: capturedImages.front }}
              className="w-16 h-24 rounded-lg border-2 border-primary/50"
            />
            <Text className="text-zinc-500 text-[10px]">Frente</Text>
          </View>
        )}
        {capturedImages.back && (
          <View className="items-center gap-1">
            <Image
              source={{ uri: capturedImages.back }}
              className="w-16 h-24 rounded-lg border-2 border-primary/50"
            />
            <Text className="text-zinc-500 text-[10px]">Costas</Text>
          </View>
        )}
        {capturedImages.side && (
          <View className="items-center gap-1">
            <Image
              source={{ uri: capturedImages.side }}
              className="w-16 h-24 rounded-lg border-2 border-primary/50"
            />
            <Text className="text-zinc-500 text-[10px]">Lateral</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}
