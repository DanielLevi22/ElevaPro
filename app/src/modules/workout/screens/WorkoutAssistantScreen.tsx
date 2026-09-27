import type { BulkWorkoutProposal } from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { KeyboardAvoidingView, Platform, type ScrollView, Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Row } from '@/components/ui/Row';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import {
  Baloes,
  CabecalhoDoAssistente,
  CampoDaConversa,
  Digitando,
} from '@/shared/chat/ChatPieces';
import { type PeriodizationProposalState, useAssistantChat } from '../hooks/useAssistantChat';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

/**
 * O mesmo chat de IA do web (`/api/ai/chat/[studentId]`), na casca do wizard
 * mobile — reaproveita a conversa e os endpoints de aprovação que já gravam
 * de verdade, em vez de uma proposta de um tiro só (issue #335).
 */
export default function WorkoutAssistantScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const wizard = useWorkoutWizardStore();
  const { fetchPeriodizationPhases, fetchWorkoutsForPhase } = useWorkoutStore();
  const token = useAuthStore((s) => s.session?.access_token ?? null);
  const rolagem = useRef<ScrollView>(null);

  const handlePeriodizationApproved = useCallback(
    async (periodizationId: string) => {
      await fetchPeriodizationPhases(periodizationId);
      const primeiraFase = useWorkoutStore.getState().currentPeriodizationPhases[0];
      if (primeiraFase) wizard.setCreatedStructure(periodizationId, primeiraFase.id);
    },
    [fetchPeriodizationPhases, wizard]
  );

  const handleWorkoutsApproved = useCallback(() => {
    if (wizard.phaseId) fetchWorkoutsForPhase(wizard.phaseId);
  }, [wizard.phaseId, fetchWorkoutsForPhase]);

  const chat = useAssistantChat({
    token: token ?? '',
    studentId,
    sessionId: wizard.aiSessionId,
    onSessionResolved: wizard.setAiSessionId,
    onPeriodizationApproved: handlePeriodizationApproved,
    onWorkoutsApproved: handleWorkoutsApproved,
  });

  function irParaMontagem() {
    router.replace({ pathname: ROUTES.WORKOUTS.WIZARD_BUILD, params: { studentId } });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GlassScreen
        bottomSpace="actionBar"
        scrollRef={rolagem}
        overlay={<CampoDaConversa respondendo={chat.responding} onEnviar={chat.sendMessage} />}
      >
        <CabecalhoDoAssistente
          assunto={`treino de ${wizard.studentName ?? 'Aluno'}`}
          onVoltar={router.back}
        />

        <Baloes mensagens={chat.messages} />

        {chat.periodizationProposal ? (
          <CartaoDePeriodizacao
            proposta={chat.periodizationProposal}
            salvando={chat.savingPeriodization}
            onAprovar={chat.approvePeriodization}
            onAjustar={() => chat.sendMessage('Quero ajustar algumas coisas na proposta.')}
            onContinuar={irParaMontagem}
          />
        ) : null}

        {chat.workoutsProposal ? (
          <CartaoDeTreinos
            proposta={chat.workoutsProposal}
            salvos={chat.savedWorkoutTitles}
            salvando={chat.savingWorkouts}
            onAprovar={chat.approveWorkouts}
            onAjustar={() => chat.sendMessage('Quero ajustar os treinos da proposta.')}
          />
        ) : null}

        {chat.responding ? <Digitando /> : null}
      </GlassScreen>
    </KeyboardAvoidingView>
  );
}

function CartaoDePeriodizacao({
  proposta,
  salvando,
  onAprovar,
  onAjustar,
  onContinuar,
}: {
  proposta: PeriodizationProposalState;
  salvando: boolean;
  onAprovar: () => void;
  onAjustar: () => void;
  onContinuar: () => void;
}) {
  const salva = Boolean(proposta.savedId);
  return (
    <Vidro className="mt-3 p-4">
      <Text className="text-[0.95rem] font-bold text-foreground">{proposta.data.name}</Text>
      <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
        {proposta.data.durationWeeks} semanas · nível {proposta.data.level}
      </Text>
      {proposta.data.phases.map((fase) => (
        <Text key={fase.name} className="mt-2 text-[0.8125rem] text-foreground">
          {fase.name} · {fase.weeks} sem · {fase.focus}
        </Text>
      ))}
      {salva ? (
        <View className="mt-3">
          <BotaoDeDestaque
            rotulo="Continuar para montagem"
            icone="arrow-forward"
            tamanho="cartao"
            onPress={onContinuar}
          />
        </View>
      ) : (
        <View className="mt-3 flex-row gap-2">
          <Row
            icon="checkmark-circle-outline"
            title={salvando ? 'Salvando…' : 'Aprovar'}
            onPress={salvando ? undefined : onAprovar}
          />
          <Row icon="create-outline" title="Ajustar" onPress={onAjustar} />
        </View>
      )}
    </Vidro>
  );
}

function CartaoDeTreinos({
  proposta,
  salvos,
  salvando,
  onAprovar,
  onAjustar,
}: {
  proposta: BulkWorkoutProposal;
  salvos: string[];
  salvando: boolean;
  onAprovar: () => void;
  onAjustar: () => void;
}) {
  const resolvido = salvos.length > 0;
  return (
    <Vidro destaque={resolvido} className="mt-3 p-4">
      <Text className="text-[0.95rem] font-bold text-foreground">
        Treinos · {proposta.phase_name}
      </Text>
      {proposta.workouts.map((treino) => (
        <Text key={treino.title} className="mt-2 text-[0.8125rem] text-foreground">
          {treino.title} · {treino.exercises?.length ?? 0} exercícios
        </Text>
      ))}
      {!resolvido && (
        <View className="mt-3 flex-row gap-2">
          <Row
            icon="checkmark-circle-outline"
            title={salvando ? 'Salvando…' : 'Aprovar todos'}
            onPress={salvando ? undefined : onAprovar}
          />
          <Row icon="create-outline" title="Ajustar" onPress={onAjustar} />
        </View>
      )}
    </Vidro>
  );
}
