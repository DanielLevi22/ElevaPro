import type { BulkWorkoutProposal } from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentRef, useRef } from 'react';
import { KeyboardAvoidingView, Platform, type ScrollView, Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Row } from '@/components/ui/Row';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { AssistantHistoryButton } from '@/shared/chat/AssistantHistoryButton';
import {
  AssistantHeader,
  ChatComposer,
  ChatMessages,
  TypingIndicator,
} from '@/shared/chat/ChatPieces';
import { type PeriodizationProposalState, useAssistantChat } from '../hooks/useAssistantChat';

/**
 * O mesmo chat de IA do web (`/api/ai/chat/[studentId]`): reaproveita a
 * conversa e os endpoints de aprovação que já gravam de verdade (#335).
 *
 * Aprovada, a periodização abre na tela dela, como as criadas à mão (#387).
 * A IA já grava fase e treinos; o que faltar se monta lá.
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
  const token = useAuthStore((s) => s.session?.access_token ?? null);
  const canNutrition = useAuthStore(
    (s) => !!s.abilities?.can('create', 'Diet') && !!s.abilities?.can('update', 'Diet')
  );
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const chat = useAssistantChat({
    token: token ?? '',
    studentId,
    sessionId: sessionId ?? null,
  });
  const blocked =
    chat.initializing ||
    chat.responding ||
    chat.savingPeriodization ||
    chat.savingWorkouts ||
    !!chat.error;

  function openPeriodization() {
    const periodizationId = chat.periodizationProposal?.savedId;
    if (periodizationId && !blocked) router.replace(ROUTES.WORKOUTS.PERIODIZATION(periodizationId));
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
              disabled={chat.responding || chat.savingPeriodization || chat.savingWorkouts}
              canWorkout
              canNutrition={canNutrition}
            />
          }
        />
        {chat.initializing && <Text className="mt-4 text-muted-foreground">Abrindo conversa…</Text>}
        {chat.error && (
          <Vidro className="mt-3 p-4">
            <Text accessibilityRole="alert" className="text-foreground">
              {chat.error}
            </Text>
            <Row icon="refresh-outline" title="Tentar novamente" onPress={chat.retry} />
          </Vidro>
        )}

        <ChatMessages messages={chat.messages} />

        {chat.periodizationProposal ? (
          <PeriodizationCard
            proposal={chat.periodizationProposal}
            saving={blocked}
            onApprove={chat.approvePeriodization}
            onAdjust={() => chat.sendMessage('Quero ajustar algumas coisas na proposta.')}
            onContinue={openPeriodization}
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
