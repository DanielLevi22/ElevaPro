import type { BulkWorkoutProposal, PeriodizationProposal } from '@elevapro/shared';
import { useEffect, useRef, useState } from 'react';
import { mensagemDeErroBff } from '@/shared/bff';
import { useChatConversation } from '@/shared/chat/useChatConversation';
import { WorkoutChatService } from '../services/WorkoutChatService';

export interface PeriodizationProposalState {
  data: PeriodizationProposal;
  savedId?: string;
}

interface Options {
  token: string;
  studentId: string;
  sessionId: string | null;
  onSessionResolved: (sessionId: string) => void;
  /** A fase já ganhou dono: o passo 2 pode voltar a mostrar o treino direto. */
  onPeriodizationApproved?: (periodizationId: string) => void;
  /** Os treinos aprovados já estão na fase — quem chamou decide se refaz a busca. */
  onWorkoutsApproved?: () => void;
}

const GREETING = 'Olá! Vou te ajudar a montar o treino deste aluno. Por onde quer começar?';

/** Retoma o chat do web e aprova somente as propostas da sessão resolvida.
 * A tela remonta por conta/aluno/sessão: respostas tardias não alcançam a próxima conversa.
 * @example const chat = useAssistantChat({ token, studentId, sessionId, onSessionResolved });
 */
export function useAssistantChat({
  token,
  studentId,
  sessionId,
  onSessionResolved,
  onPeriodizationApproved,
  onWorkoutsApproved,
}: Options) {
  const chat = useChatConversation(GREETING);
  const [initializing, setInitializing] = useState(true);
  const [periodization, setPeriodization] = useState<PeriodizationProposalState | null>(null);
  const [workouts, setWorkouts] = useState<BulkWorkoutProposal | null>(null);
  const [savedTitles, setSavedTitles] = useState<string[]>([]);
  const [saving, setSaving] = useState<'periodization' | 'workouts' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const resolvedSession = useRef<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const authenticated = Boolean(token);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a tela remonta por destino; resolver a sessão não reinicia o carregamento
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    resolvedSession.current = null;
    setInitializing(true);
    setError(null);
    WorkoutChatService.loadSession(token, studentId, sessionId ?? undefined)
      .then((session) => {
        if (cancelled) return;
        resolvedSession.current = session.sessionId;
        onSessionResolved(session.sessionId);
        chat.load(session.messages);
        setPeriodization(
          session.periodization
            ? { data: session.periodization, savedId: session.savedPeriodizationId ?? undefined }
            : null
        );
        setSavedTitles(session.savedWorkoutTitles);
        setWorkouts(session.workoutProposal);
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(mensagemDeErroBff(failure));
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [authenticated, studentId, attempt]);

  const blocked = () => initializing || !!error || busy.current || !resolvedSession.current;
  const sendMessage = (text: string) => {
    if (blocked() || !text.trim()) return;
    busy.current = true;
    void chat
      .reply(text, ({ text: write, error: fail }) =>
        WorkoutChatService.sendMessage(
          token,
          studentId,
          text.trim(),
          resolvedSession.current,
          (event) => {
            if (!mounted.current) return;
            if (event.type === 'text') write(event.content);
            else if (event.type === 'proposal') setPeriodization({ data: event.data });
            else if (event.type === 'workout_proposal') {
              setWorkouts(event.data);
              setSavedTitles([]);
            } else if (event.type === 'saved' && event.entity === 'periodization') {
              setPeriodization((current) =>
                current ? { ...current, savedId: event.id } : current
              );
            } else if (event.type === 'error') fail(event.message);
          }
        )
      )
      .finally(() => {
        busy.current = false;
      });
  };

  async function approve(kind: 'periodization' | 'workouts', work: () => Promise<void>) {
    if (blocked()) return;
    busy.current = true;
    setSaving(kind);
    try {
      await work();
    } catch {
      if (mounted.current) chat.say('Não consegui salvar agora. Tente de novo.');
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(null);
    }
  }

  const approvePeriodization = () => {
    if (!periodization || periodization.savedId) return;
    return approve('periodization', async () => {
      const saved = await WorkoutChatService.approvePeriodization(
        token,
        studentId,
        resolvedSession.current
      );
      if (!mounted.current) return;
      setPeriodization((current) => (current ? { ...current, savedId: saved.id } : current));
      chat.say(
        `Pronto! Periodização "${saved.name}" salva. Podemos montar os treinos da primeira fase.`
      );
      onPeriodizationApproved?.(saved.id);
    });
  };
  const approveWorkouts = () => {
    if (!workouts || savedTitles.length) return;
    return approve('workouts', async () => {
      const saved = await WorkoutChatService.approveWorkouts(
        token,
        studentId,
        resolvedSession.current
      );
      if (!mounted.current) return;
      setSavedTitles(saved.saved.map((workout) => workout.title));
      chat.say(
        `Pronto! ${saved.saved.length} treinos salvos na fase ${workouts.phase_name}. Podemos continuar a montagem.`
      );
      onWorkoutsApproved?.();
    });
  };

  return {
    messages: chat.messages,
    initializing,
    responding: chat.responding,
    periodizationProposal: periodization,
    workoutsProposal: workouts,
    savedWorkoutTitles: savedTitles,
    savingPeriodization: saving === 'periodization',
    savingWorkouts: saving === 'workouts',
    error,
    sessionId: resolvedSession.current,
    retry: () => setAttempt((current) => current + 1),
    sendMessage,
    approvePeriodization,
    approveWorkouts,
  };
}
