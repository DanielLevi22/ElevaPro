import type { BulkWorkoutProposal, ChatMessage, PeriodizationProposal } from '@elevapro/shared';
import { useCallback, useEffect, useState } from 'react';
import { WorkoutChatService } from '../services/WorkoutChatService';

export interface PropostaDePeriodizacao {
  data: PeriodizationProposal;
  savedId?: string;
}

export interface AssistantChat {
  mensagens: ChatMessage[];
  inicializando: boolean;
  respondendo: boolean;
  propostaPeriodizacao: PropostaDePeriodizacao | null;
  propostaTreinos: BulkWorkoutProposal | null;
  treinosSalvos: string[];
  salvandoPeriodizacao: boolean;
  salvandoTreinos: boolean;
  enviar: (texto: string) => void;
  aprovarPeriodizacao: () => void;
  aprovarTreinos: () => void;
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

function mensagemDoAssistente(conteudo: string): ChatMessage {
  return {
    id: `assistente-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    role: 'assistant',
    content: conteudo,
    createdAt: new Date().toISOString(),
  };
}

const SAUDACAO_PADRAO: ChatMessage = {
  id: 'boas-vindas',
  role: 'assistant',
  content: 'Olá! Vou te ajudar a montar o treino deste aluno. Por onde quer começar?',
  createdAt: new Date().toISOString(),
};

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
  const [mensagens, setMensagens] = useState<ChatMessage[]>([SAUDACAO_PADRAO]);
  const [inicializando, setInicializando] = useState(true);
  const [respondendo, setRespondendo] = useState(false);
  const [propostaPeriodizacao, setPropostaPeriodizacao] = useState<PropostaDePeriodizacao | null>(
    null
  );
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
        setMensagens(sessao.messages.length > 0 ? sessao.messages : [SAUDACAO_PADRAO]);
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
    async (texto: string) => {
      const pergunta = texto.trim();
      if (!pergunta || respondendo) return;

      const assistantId = `assistente-${Date.now()}`;
      setMensagens((atuais) => [
        ...atuais,
        {
          id: `aluno-${Date.now()}`,
          role: 'user',
          content: pergunta,
          createdAt: new Date().toISOString(),
        },
        { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString() },
      ]);
      setRespondendo(true);

      try {
        await WorkoutChatService.sendMessage(token, studentId, pergunta, sessionId, (evento) => {
          if (evento.type === 'text') {
            setMensagens((atuais) =>
              atuais.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + evento.content } : m
              )
            );
          } else if (evento.type === 'proposal') {
            setPropostaPeriodizacao({ data: evento.data });
          } else if (evento.type === 'workout_proposal') {
            setPropostaTreinos(evento.data);
            setTreinosSalvos([]);
          } else if (evento.type === 'saved' && evento.entity === 'periodization') {
            setPropostaPeriodizacao((atual) => (atual ? { ...atual, savedId: evento.id } : atual));
          } else if (evento.type === 'error') {
            setMensagens((atuais) =>
              atuais.map((m) =>
                m.id === assistantId ? { ...m, content: `Erro: ${evento.message}` } : m
              )
            );
          }
        });
      } catch {
        setMensagens((atuais) =>
          atuais.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Não consegui responder agora. Tente de novo.' }
              : m
          )
        );
      } finally {
        setRespondendo(false);
      }
    },
    [token, studentId, sessionId, respondendo]
  );

  const aprovarPeriodizacao = useCallback(async () => {
    if (!propostaPeriodizacao || propostaPeriodizacao.savedId || salvandoPeriodizacao) return;
    setSalvandoPeriodizacao(true);
    try {
      const salva = await WorkoutChatService.approvePeriodization(token, studentId, sessionId);
      setPropostaPeriodizacao((atual) => (atual ? { ...atual, savedId: salva.id } : atual));
      setMensagens((atuais) => [
        ...atuais,
        mensagemDoAssistente(
          `Pronto! Periodização "${salva.name}" salva. Podemos montar os treinos da primeira fase.`
        ),
      ]);
      onPeriodizationApproved?.(salva.id);
    } catch {
      setMensagens((atuais) => [
        ...atuais,
        mensagemDoAssistente('Não consegui salvar a periodização agora. Tente de novo.'),
      ]);
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
  ]);

  const aprovarTreinos = useCallback(async () => {
    if (!propostaTreinos || salvandoTreinos) return;
    const fase = propostaTreinos.phase_name;
    setSalvandoTreinos(true);
    try {
      const salvo = await WorkoutChatService.approveWorkouts(token, studentId, sessionId);
      setTreinosSalvos(salvo.saved.map((w) => w.title));
      setMensagens((atuais) => [
        ...atuais,
        mensagemDoAssistente(
          `Pronto! ${salvo.saved.length === 1 ? '1 treino salvo' : `${salvo.saved.length} treinos salvos`} na fase ${fase}.`
        ),
      ]);
      onWorkoutsApproved?.();
      enviar(`Aprovei os treinos da fase ${fase}. E agora?`);
    } catch {
      setMensagens((atuais) => [
        ...atuais,
        mensagemDoAssistente('Não consegui salvar os treinos agora. Tente de novo.'),
      ]);
    } finally {
      setSalvandoTreinos(false);
    }
  }, [propostaTreinos, salvandoTreinos, token, studentId, sessionId, onWorkoutsApproved, enviar]);

  return {
    mensagens,
    inicializando,
    respondendo,
    propostaPeriodizacao,
    propostaTreinos,
    treinosSalvos,
    salvandoPeriodizacao,
    salvandoTreinos,
    enviar,
    aprovarPeriodizacao,
    aprovarTreinos,
  };
}
