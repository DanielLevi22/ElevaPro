import { type BulkWorkoutProposal, createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, type ScrollView, Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Row } from '@/components/ui/Row';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { mensagemDeErroBff } from '@/shared/bff';
import { AssistantHistoryButton } from '@/shared/chat/AssistantHistoryButton';
import {
  AssistantHeader,
  ChatComposer,
  ChatMessages,
  TypingIndicator,
} from '@/shared/chat/ChatPieces';
import { type PeriodizationProposalState, useAssistantChat } from '../hooks/useAssistantChat';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

const workoutsService = createWorkoutsService(supabase);

/**
 * O mesmo chat de IA do web (`/api/ai/chat/[studentId]`), na casca do wizard
 * mobile — reaproveita a conversa e os endpoints de aprovação que já gravam
 * de verdade, em vez de uma proposta de um tiro só (issue #335).
 */
export default function WorkoutAssistantScreen() {
  const { studentId, sessionId } = useLocalSearchParams<{
    studentId?: string;
    sessionId?: string;
  }>();
  const actorId = useAuthStore((s) => s.user?.id);
  const allowed = useAuthStore(
    (s) =>
      s.accountType === 'specialist' &&
      !!s.abilities?.can('create', 'Workout') &&
      !!s.abilities?.can('create', 'Periodization')
  );
  if (!allowed || !studentId)
    return (
      <GlassScreen>
        <Text className="mt-4 text-foreground">
          Assistente indisponível para esta conta ou aluno.
        </Text>
      </GlassScreen>
    );
  return (
    <WorkoutAssistantConversation
      key={`${actorId}:${studentId}:${sessionId ?? 'current'}`}
      studentId={studentId}
      sessionId={sessionId}
    />
  );
}

function WorkoutAssistantConversation({
  studentId,
  sessionId,
}: {
  studentId: string;
  sessionId?: string;
}) {
  const router = useRouter();
  const wizard = useWorkoutWizardStore();
  const token = useAuthStore((s) => s.session?.access_token ?? null);
  const canNutrition = useAuthStore(
    (s) => !!s.abilities?.can('create', 'Diet') && !!s.abilities?.can('update', 'Diet')
  );
  const scroll = useRef<ScrollView>(null);
  const mounted = useRef(true);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const chat = useAssistantChat({
    token: token ?? '',
    studentId,
    sessionId: sessionId ?? null,
    onSessionResolved: (id) => {
      if (useWorkoutWizardStore.getState().studentId === studentId) wizard.setAiSessionId(id);
    },
  });
  const blocked =
    opening ||
    chat.initializing ||
    chat.responding ||
    chat.savingPeriodization ||
    chat.savingWorkouts ||
    !!chat.error;

  async function openBuilder() {
    const periodizationId = chat.periodizationProposal?.savedId;
    if (!periodizationId || blocked) return;
    setOpening(true);
    setOpenError(null);
    try {
      const periodization = await workoutsService.fetchPeriodizationById(periodizationId);
      if (!mounted.current) return;
      if (!periodization) throw new Error('Periodização indisponível para esta conta.');
      const phases = await workoutsService.fetchTrainingPlans(periodizationId);
      if (!mounted.current) return;
      const phase = phases.find((item) => item.periodization_id === periodizationId);
      if (!phase) throw new Error('Esta periodização não tem uma fase disponível para montagem.');
      // A IA já cria a periodização ativa; a publicação do mobile ativa a fase.
      if (periodization.status === 'completed' || phase.status !== 'planned') {
        router.replace(ROUTES.WORKOUTS.PERIODIZATION(periodizationId));
        return;
      }
      const name = wizard.studentId === studentId ? wizard.studentName : null;
      wizard.startFor(studentId, name ?? 'Aluno');
      wizard.setCreatedStructure(periodizationId, phase.id);
      if (chat.sessionId) wizard.setAiSessionId(chat.sessionId);
      router.replace({
        pathname: ROUTES.WORKOUTS.WIZARD_BUILD,
        params: { studentId, sessionId: chat.sessionId ?? '' },
      });
    } catch (failure) {
      if (mounted.current) setOpenError(mensagemDeErroBff(failure));
    } finally {
      if (mounted.current) setOpening(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GlassScreen
        bottomSpace="actionBar"
        scrollRef={scroll}
        overlay={<ChatComposer busy={blocked} onSend={chat.sendMessage} />}
      >
        <AssistantHeader
          subject="plano de treino"
          onBack={router.back}
          history={
            <AssistantHistoryButton
              token={token ?? ''}
              studentId={studentId}
              disabled={
                chat.responding || chat.savingPeriodization || chat.savingWorkouts || opening
              }
              canWorkout
              canNutrition={canNutrition}
            />
          }
        />
        {chat.initializing && <Text className="mt-4 text-muted-foreground">Abrindo conversa…</Text>}
        {(chat.error || openError) && (
          <Vidro className="mt-3 p-4">
            <Text accessibilityRole="alert" className="text-foreground">
              {chat.error || openError}
            </Text>
            {chat.error && (
              <Row icon="refresh-outline" title="Tentar novamente" onPress={chat.retry} />
            )}
          </Vidro>
        )}

        <ChatMessages messages={chat.messages} />

        {chat.periodizationProposal ? (
          <PeriodizationCard
            proposal={chat.periodizationProposal}
            saving={blocked}
            onApprove={chat.approvePeriodization}
            onAdjust={() => chat.sendMessage('Quero ajustar algumas coisas na proposta.')}
            onContinue={openBuilder}
          />
        ) : null}

        {chat.workoutsProposal ? (
          <WorkoutsCard
            proposal={chat.workoutsProposal}
            savedTitles={chat.savedWorkoutTitles}
            saving={blocked}
            onApprove={chat.approveWorkouts}
            onAdjust={() => chat.sendMessage('Quero ajustar os treinos da proposta.')}
          />
        ) : null}

        {chat.responding ? <TypingIndicator /> : null}
      </GlassScreen>
    </KeyboardAvoidingView>
  );
}

function PeriodizationCard({
  proposal,
  saving,
  onApprove,
  onAdjust,
  onContinue,
}: {
  proposal: PeriodizationProposalState;
  saving: boolean;
  onApprove: () => void;
  onAdjust: () => void;
  onContinue: () => void;
}) {
  const saved = Boolean(proposal.savedId);
  return (
    <Vidro className="mt-3 p-4">
      <Text className="text-[0.95rem] font-bold text-foreground">{proposal.data.name}</Text>
      <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
        {proposal.data.durationWeeks} semanas · nível {proposal.data.level}
      </Text>
      {proposal.data.phases.map((phase) => (
        <Text key={phase.name} className="mt-2 text-[0.8125rem] text-foreground">
          {phase.name} · {phase.weeks} sem · {phase.focus}
        </Text>
      ))}
      {saved ? (
        <View className="mt-3">
          <BotaoDeDestaque
            rotulo="Abrir plano de treino"
            icone="arrow-forward"
            tamanho="cartao"
            onPress={onContinue}
            disabled={saving}
          />
        </View>
      ) : (
        <View className="mt-3 flex-row gap-2">
          <Row
            icon="checkmark-circle-outline"
            title={saving ? 'Salvando…' : 'Aprovar'}
            onPress={saving ? undefined : onApprove}
          />
          <Row icon="create-outline" title="Ajustar" onPress={saving ? undefined : onAdjust} />
        </View>
      )}
    </Vidro>
  );
}

function WorkoutsCard({
  proposal,
  savedTitles,
  saving,
  onApprove,
  onAdjust,
}: {
  proposal: BulkWorkoutProposal;
  savedTitles: string[];
  saving: boolean;
  onApprove: () => void;
  onAdjust: () => void;
}) {
  const resolved = savedTitles.length > 0;
  return (
    <Vidro destaque={resolved} className="mt-3 p-4">
      <Text className="text-[0.95rem] font-bold text-foreground">
        Treinos · {proposal.phase_name}
      </Text>
      {proposal.workouts.map((workout) => (
        <Text key={workout.title} className="mt-2 text-[0.8125rem] text-foreground">
          {workout.title} · {workout.exercises?.length ?? 0} exercícios
        </Text>
      ))}
      {!resolved && (
        <View className="mt-3 flex-row gap-2">
          <Row
            icon="checkmark-circle-outline"
            title={saving ? 'Salvando…' : 'Aprovar todos'}
            onPress={saving ? undefined : onApprove}
          />
          <Row icon="create-outline" title="Ajustar" onPress={saving ? undefined : onAdjust} />
        </View>
      )}
    </Vidro>
  );
}
