import type { BulkWorkoutProposal, ChatMessage, PeriodizationProposal } from '@elevapro/shared';
import { useCallback, useEffect, useState } from 'react';
import { useChatConversation } from '@/shared/chat/useChatConversation';
import { WorkoutChatService } from '../services/WorkoutChatService';

export interface PeriodizationProposalState {
  data: PeriodizationProposal;
  savedId?: string;
}

export interface AssistantChat {
  messages: ChatMessage[];
  initializing: boolean;
  responding: boolean;
  periodizationProposal: PeriodizationProposalState | null;
  workoutsProposal: BulkWorkoutProposal | null;
  savedWorkoutTitles: string[];
  savingPeriodization: boolean;
  savingWorkouts: boolean;
  sendMessage: (texto: string) => void;
  approvePeriodization: () => void;
  approveWorkouts: () => void;
}

interface OpcoesDoChat {
  token: string;
  studentId: string;
  sessionId: string | null;
  onSessionResolved: (sessionId: string) => void;
  /** A fase já ganhou dono: o passo 2 pode voltar a mostrar o treino direto. */
  onPeriodizationApproved?: (periodizationId: string) => void;
  /** Os treinos aprovados já estão na fase — quem chamou decide se refaz a busca. */
  onWorkoutsApproved?: () => void;
}

const SAUDACAO = 'Olá! Vou te ajudar a montar o treino deste aluno. Por onde quer começar?';

/**
 * A conversa do especialista com o assistente de treino — o mesmo chat do
 * web (`/api/ai/chat/[studentId]`), pela sessão que `WorkoutChatService` já
 * fala com o orquestrador (`propose_periodization`/`propose_workouts`).
 *
 * @example
 * const chat = useAssistantChat({ token, studentId, sessionId: wizard.aiSessionId,
 *   onSessionResolved: wizard.setAiSessionId });
 */
export function useAssistantChat({
  token,
  studentId,
  sessionId,
  onSessionResolved,
  onPeriodizationApproved,
  onWorkoutsApproved,
}: OpcoesDoChat): AssistantChat {
  const chat = useChatConversation(SAUDACAO);
  const [inicializando, setInicializando] = useState(true);
  const [propostaPeriodizacao, setPropostaPeriodizacao] =
    useState<PeriodizationProposalState | null>(null);
  const [propostaTreinos, setPropostaTreinos] = useState<BulkWorkoutProposal | null>(null);
  const [treinosSalvos, setTreinosSalvos] = useState<string[]>([]);
  const [salvandoPeriodizacao, setSalvandoPeriodizacao] = useState(false);
  const [salvandoTreinos, setSalvandoTreinos] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: carrega uma vez por aluno; sessionId/onSessionResolved mudariam o efeito a cada resposta do próprio efeito
  useEffect(() => {
    let cancelado = false;
    WorkoutChatService.loadSession(token, studentId, sessionId ?? undefined)
      .then((sessao) => {
        if (cancelado) return;
        onSessionResolved(sessao.sessionId);
        chat.load(sessao.messages);
        setPropostaPeriodizacao(
          sessao.periodization
            ? { data: sessao.periodization, savedId: sessao.savedPeriodizationId ?? undefined }
            : null
        );
        setTreinosSalvos(sessao.savedWorkoutTitles);
        setPropostaTreinos(sessao.workoutProposal);
      })
      .catch(() => {
        // Silêncio aqui é o comportamento do web: a tela mostra a boas-vindas.
      })
      .finally(() => {
        if (!cancelado) setInicializando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, studentId]);

  const enviar = useCallback(
    (texto: string) => {
      if (chat.responding) return;
      chat.reply(texto, ({ text, error }) =>
        WorkoutChatService.sendMessage(token, studentId, texto.trim(), sessionId, (evento) => {
          if (evento.type === 'text') text(evento.content);
          else if (evento.type === 'proposal') setPropostaPeriodizacao({ data: evento.data });
          else if (evento.type === 'workout_proposal') {
            setPropostaTreinos(evento.data);
            setTreinosSalvos([]);
          } else if (evento.type === 'saved' && evento.entity === 'periodization') {
            setPropostaPeriodizacao((atual) => (atual ? { ...atual, savedId: evento.id } : atual));
          } else if (evento.type === 'error') error(evento.message);
        })
      );
    },
    [chat, token, studentId, sessionId]
  );

  const aprovarPeriodizacao = useCallback(async () => {
    if (!propostaPeriodizacao || propostaPeriodizacao.savedId || salvandoPeriodizacao) return;
    setSalvandoPeriodizacao(true);
    try {
      const salva = await WorkoutChatService.approvePeriodization(token, studentId, sessionId);
      setPropostaPeriodizacao((atual) => (atual ? { ...atual, savedId: salva.id } : atual));
      chat.say(
        `Pronto! Periodização "${salva.name}" salva. Podemos montar os treinos da primeira fase.`
      );
      onPeriodizationApproved?.(salva.id);
    } catch {
      chat.say('Não consegui salvar a periodização agora. Tente de novo.');
    } finally {
      setSalvandoPeriodizacao(false);
    }
  }, [
    propostaPeriodizacao,
    salvandoPeriodizacao,
    token,
    studentId,
    sessionId,
    onPeriodizationApproved,
    chat,
  ]);

  const aprovarTreinos = useCallback(async () => {
    if (!propostaTreinos || salvandoTreinos) return;
    const fase = propostaTreinos.phase_name;
    setSalvandoTreinos(true);
    try {
      const salvo = await WorkoutChatService.approveWorkouts(token, studentId, sessionId);
      setTreinosSalvos(salvo.saved.map((w) => w.title));
      chat.say(
        `Pronto! ${salvo.saved.length === 1 ? '1 treino salvo' : `${salvo.saved.length} treinos salvos`} na fase ${fase}.`
      );
      onWorkoutsApproved?.();
      enviar(`Aprovei os treinos da fase ${fase}. E agora?`);
    } catch {
      chat.say('Não consegui salvar os treinos agora. Tente de novo.');
    } finally {
      setSalvandoTreinos(false);
    }
  }, [
    propostaTreinos,
    salvandoTreinos,
    token,
    studentId,
    sessionId,
    onWorkoutsApproved,
    enviar,
    chat,
  ]);

  return {
    messages: chat.messages,
    initializing: inicializando,
    responding: chat.responding,
    periodizationProposal: propostaPeriodizacao,
    workoutsProposal: propostaTreinos,
    savedWorkoutTitles: treinosSalvos,
    savingPeriodization: salvandoPeriodizacao,
    savingWorkouts: salvandoTreinos,
    sendMessage: enviar,
    approvePeriodization: aprovarPeriodizacao,
    approveWorkouts: aprovarTreinos,
  };
}
