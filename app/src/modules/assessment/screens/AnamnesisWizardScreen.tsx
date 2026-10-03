import { GENERAL_ANAMNESIS } from '@elevapro/shared/data/anamnesisQuestions';
import { supabase } from '@elevapro/supabase';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { StepBar } from '@/components/ui/StepBar';
import { QuestionInput } from '../components/QuestionInput';
import { useAssessmentStore } from '../store/assessmentStore';

/**
 * A anamnese do Aluno, por etapas, no kit de vidro (#361): passos no topo, as
 * perguntas da etapa em vidro e a barra fixa de voltar e avançar.
 *
 * @example <AnamnesisWizardScreen />
 */
export default function AnamnesisWizardScreen() {
  const router = useRouter();
  const {
    currentSectionIndex,
    anamnesisResponses,
    setAnamnesisResponse,
    setSectionIndex,
    submitAnamnesis,
    setStudentId,
    syncAnamnesis,
    studentId,
  } = useAssessmentStore();

  useEffect(() => {
    const initSession = async () => {
      // If we already have a studentId, just sync (or do nothing if we want to trust local state)
      // But usually good to ensure we have the logged in user
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        if (session.user.id !== studentId) {
          console.log('Initializing Anamnesis for user:', session.user.id);
          setStudentId(session.user.id);
          await syncAnamnesis(session.user.id);
        } else {
          // Already has ID, but maybe ensuring sync?
          // await syncAnamnesis(session.user.id);
        }
      } else {
        showAlert({ title: 'Erro', message: 'Usuário não autenticado.', type: 'error' });
        router.back();
      }
    };

    initSession();
  }, [studentId, setStudentId, syncAnamnesis, router]);

  const currentSection = GENERAL_ANAMNESIS[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === GENERAL_ANAMNESIS.length - 1;

  const visivel = (condition?: { questionId: string; expectedValue: unknown }) =>
    !condition || anamnesisResponses[condition.questionId] === condition.expectedValue;

  const handleNext = () => {
    // Obrigatória, visível pela condição e ainda sem resposta.
    const missingFields = currentSection.questions.filter((q) => {
      if (!q.required || !visivel(q.condition)) return false;
      const answer = anamnesisResponses[q.id];
      return (
        answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)
      );
    });

    if (missingFields.length > 0) {
      showAlert({
        type: 'warning',
        title: 'Atenção',
        message: `Por favor, responda: ${missingFields.map((q) => q.text).join(', ')}`,
      });
      return;
    }

    if (isLastSection) handleSubmit();
    else setSectionIndex(currentSectionIndex + 1);
  };

  const handleBack = () => {
    if (isFirstSection) router.back();
    else setSectionIndex(currentSectionIndex - 1);
  };

  const handleSubmit = async () => {
    try {
      await submitAnamnesis();
      showAlert({
        type: 'success',
        title: 'Sucesso',
        message: 'Anamnese enviada com sucesso!',
        onDismiss: () => router.back(),
      });
    } catch (_error) {
      showAlert({ type: 'error', title: 'Erro', message: 'Ocorreu um erro ao enviar a anamnese.' });
    }
  };

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{
            rotulo: isFirstSection ? 'Voltar' : 'Anterior',
            icone: 'arrow-back',
            onPress: handleBack,
          }}
          principal={{
            rotulo: isLastSection ? 'Finalizar anamnese' : 'Próxima etapa',
            icone: isLastSection ? 'checkmark' : 'arrow-forward',
            onPress: handleNext,
          }}
        />
      }
    >
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Fechar a anamnese" onPress={router.back} />
        <View className="flex-1">
          <StepBar current={currentSectionIndex + 1} total={GENERAL_ANAMNESIS.length} />
        </View>
      </View>

      {/* A etapa nova entra com um fade: o conteúdo inteiro troca de uma vez. */}
      <Animated.View
        key={currentSection.id}
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(200)}
        className="mt-6"
      >
        <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
          Anamnese
        </Text>
        <Text
          accessibilityRole="header"
          className="mb-5 mt-1 font-display-black text-[1.625rem] leading-[1.875rem] tracking-tight text-hero"
        >
          {currentSection.title}
        </Text>

        {currentSection.questions
          .filter((question) => visivel(question.condition))
          .map((question) => (
            <QuestionInput
              key={question.id}
              question={question}
              value={anamnesisResponses[question.id]}
              onChange={(val) =>
                setAnamnesisResponse(question.id, val as string | number | boolean | string[])
              }
            />
          ))}
      </Animated.View>
    </GlassScreen>
  );
}
