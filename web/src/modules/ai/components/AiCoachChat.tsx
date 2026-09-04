"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { criarAcumuladorDeTexto } from "../services/acumuladorDeTexto";
import type { BlocoDeContexto } from "../services/disponibilidade";
import { dispensar, foiDispensada } from "../services/propostaDispensada";
import type { BulkWorkoutProposal, ChatMessage, PeriodizationProposal, SseEvent } from "../types";
import { BulkWorkoutProposalCard } from "./BulkWorkoutProposalCard";
import { ContextoDisponivel } from "./ContextoDisponivel";
import { PainelDeProposta } from "./PainelDeProposta";
import { PeriodizationProposalCard } from "./PeriodizationProposalCard";

interface Props {
  studentId: string;
  /** Qual conversa abrir. `null` retoma a mais recente, como antes da lateral. */
  sessionId: string | null;
  /** A conversa que o servidor de fato abriu — pode ser uma criada agora. */
  onSessionResolved: (sessionId: string) => void;
  /** Algo mudou o que a lista mostra: mensagem nova, ordem, título. */
  onConversationChanged: () => void;
}

interface PeriodizationCard {
  data: PeriodizationProposal;
  savedId?: string;
}

export function AiCoachChat({
  studentId,
  sessionId,
  onSessionResolved,
  onConversationChanged,
}: Props) {
  const session = useAuthStore((s) => s.session);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [proposal, setProposal] = useState<PeriodizationCard | null>(null);
  const [workoutProposal, setWorkoutProposal] = useState<BulkWorkoutProposal | null>(null);
  const [savedWorkoutTitles, setSavedWorkoutTitles] = useState<string[]>([]);
  /** Com que dados o coach está trabalhando — só a existência, nunca o valor. */
  const [contexto, setContexto] = useState<BlocoDeContexto[]>([]);
  const [savingWorkouts, setSavingWorkouts] = useState(false);
  /** O que o coach está fazendo agora, enquanto a ferramenta roda. */
  const [activity, setActivity] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Carrega a conversa que a lateral escolheu.
   *
   * Sem `sessionId`, retoma a mais recente — o comportamento de antes de
   * existirem várias, preservado para a primeira visita.
   */
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelado = false;

    const url = sessionId
      ? `/api/ai/chat/${studentId}?sessionId=${sessionId}`
      : `/api/ai/chat/${studentId}`;

    fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelado) return;
        if (data.sessionId) onSessionResolved(data.sessionId);
        setContexto(data.availability ?? []);
        // A proposta que o servidor guardou volta para a tela: pendente, se
        // há decisão a tomar; aprovada, com os treinos que foram salvos. Sem
        // isto, sair da tela e voltar apagava o cartão — e o botão de aprovar
        // com ele — com a proposta viva no banco.
        const titulos: string[] = data.savedWorkoutTitles ?? [];
        const resolvida = titulos.length > 0;
        setSavedWorkoutTitles(titulos);
        setWorkoutProposal(
          resolvida && data.sessionId && foiDispensada(data.sessionId)
            ? null
            : (data.workoutProposal ?? null),
        );
        setMessages(
          data.messages?.length
            ? data.messages
            : [
                {
                  id: "welcome",
                  role: "assistant",
                  content:
                    "Olá! Sou o Assistente. Vou te ajudar a criar o planejamento de treino deste aluno. Por onde quer começar?",
                  createdAt: new Date().toISOString(),
                },
              ],
        );
      })
      .catch(() => {
        // Silêncio aqui é o comportamento anterior; a tela mostra a boas-vindas.
      })
      .finally(() => {
        if (!cancelado) setInitializing(false);
      });

    return () => {
      cancelado = true;
    };
  }, [session?.access_token, studentId, sessionId, onSessionResolved]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: as dependências são o gatilho da rolagem, não insumo do corpo do efeito — rolar para o fim quando qualquer uma muda é o comportamento desejado
  useEffect(() => {
    // Durante o streaming a rolagem não é animada: o texto chega dezenas de
    // vezes por segundo, e cada `smooth` reinicia a animação anterior antes de
    // ela terminar — o resultado é tremor, não suavidade. Fora do streaming a
    // animação tem tempo de acontecer e ajuda a pessoa a acompanhar o salto.
    bottomRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth" });
  }, [messages, proposal, workoutProposal, activity, loading]);

  /**
   * Salva a proposta guardada no servidor, não a que está na tela.
   *
   * O modelo já emitiu a proposta uma vez e ela ficou em `pendingWorkoutProposal`;
   * pedir para ele reemitir na aprovação abriria espaço para divergir do que o
   * especialista aprovou olhando o cartão.
   */
  async function approveWorkouts() {
    if (!workoutProposal || savingWorkouts || !session?.access_token) return;

    setSavingWorkouts(true);
    try {
      const res = await fetch(`/api/ai/chat/${studentId}/save-workouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        // Qual conversa: a proposta guardada vive no `state` desta, e sem o id
        // o servidor aprovava contra a mais recente da lateral.
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? "falha ao salvar");

      const salvos = (data.saved ?? []) as { title: string }[];
      setSavedWorkoutTitles(salvos.map((w) => w.title));
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Pronto! ${salvos.length === 1 ? "1 treino salvo" : `${salvos.length} treinos salvos`} na fase ${workoutProposal.phase_name}.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("[AiCoachChat] salvar treinos", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Não consegui salvar os treinos agora. Tente de novo em instantes.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSavingWorkouts(false);
    }
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading || !session?.access_token) return;

    setInput("");
    setActivity(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
    const texto = criarAcumuladorDeTexto((pedaco) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + pedaco } : m)),
      ),
    );
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const response = await fetch(`/api/ai/chat/${studentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: msg, sessionId }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: SseEvent = JSON.parse(line.slice(6));

            if (event.type === "text") {
              texto.empurrar(event.content);
            } else if (event.type === "proposal") {
              setProposal({ data: event.data });
            } else if (event.type === "tool_start") {
              setActivity(event.label);
            } else if (event.type === "tool_end") {
              setActivity(null);
            } else if (event.type === "workout_proposal") {
              setWorkoutProposal(event.data);
              setSavedWorkoutTitles([]);
            } else if (event.type === "saved" && event.entity === "periodization") {
              // Só marca o cartão que ainda está na tela. Recriar o que saiu ao
              // aprovar o traria de volta abaixo de texto mais novo — cartão é
              // renderizado sempre no fim da lista —, e a leitura vira "isto
              // voltou". A confirmação de que salvou é a frase do coach, que
              // aparece na ordem em que aconteceu.
              setProposal((prev) => (prev ? { ...prev, savedId: event.id } : null));
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: `Erro: ${event.message}` } : m,
                ),
              );
            }
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }
    } finally {
      // O último pedaço chega depois do último quadro: sem isto a resposta
      // aparece truncada na tela e completa no histórico.
      texto.liberar();
      setLoading(false);
      setActivity(null);
      inputRef.current?.focus();
      // A conversa subiu para o topo da lista, e é aqui que ela ganha título.
      onConversationChanged();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando histórico...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        <ContextoDisponivel blocos={contexto} />

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 mr-2 mt-0.5">
                AI
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-surface border border-white/10 text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content || (
                <span className="flex gap-1 items-center text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Só enquanto uma ferramenta roda de verdade — consultar catálogo,
            gravar periodização. Enquanto o modelo apenas escreve, quem indica
            que ele está trabalhando são os pontinhos dentro da própria bolha,
            e dois indicadores ao mesmo tempo pareciam defeito.

            O preço: o JSON da proposta é gerado DENTRO do bloco `tool_use`, que
            só chega completo, então entre a última palavra do modelo e o
            `tool_start` seguem 15 a 20 segundos sem evento nenhum. */}
        {activity && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-2.5 rounded-2xl rounded-bl-sm border border-white/10 bg-surface px-4 py-2.5 text-sm text-muted-foreground"
              aria-live="polite"
            >
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
              </span>
              {activity}…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Proposta pendente mora aqui, fora da lista: é ação esperando decisão,
          não mensagem. Dentro da lista ela era só o último item — texto novo
          entrava antes dela, e enviar a mensagem seguinte a fazia sumir com a
          única via de aprovação junto. */}
      {proposal && (
        <PainelDeProposta
          titulo="Proposta de periodização"
          resolvido={Boolean(proposal.savedId)}
          onFechar={() => setProposal(null)}
        >
          <PeriodizationProposalCard
            data={proposal.data}
            savedId={proposal.savedId}
            loading={loading}
            onApprove={() => sendMessage("Aprovado! Pode salvar a periodização.")}
            onAdjust={() => sendMessage("Quero ajustar algumas coisas na proposta.")}
          />
        </PainelDeProposta>
      )}

      {/* A aprovação dos treinos acontece aqui, não no chat: o que é salvo é a
          cópia guardada no servidor, idêntica à revisada. */}
      {workoutProposal && (
        <PainelDeProposta
          titulo="Proposta de treinos"
          resolvido={savedWorkoutTitles.length > 0}
          onFechar={() => {
            // Fechar tem que fechar: sem lembrar, o cartão voltaria na próxima
            // vez que a conversa abrisse e o botão teria mentido.
            if (sessionId) dispensar(sessionId);
            setWorkoutProposal(null);
          }}
        >
          <BulkWorkoutProposalCard
            data={workoutProposal}
            savedTitles={savedWorkoutTitles}
            loading={savingWorkouts || loading}
            onApproveAll={approveWorkouts}
            onAdjust={() => sendMessage("Quero ajustar os treinos da proposta.")}
          />
        </PainelDeProposta>
      )}

      {/* Input */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Digite uma mensagem... (Enter para enviar)"
            disabled={loading}
            className="flex-1 resize-none bg-surface border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />
          <Button
            size="icon"
            aria-label="Enviar mensagem"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="shrink-0"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Shift+Enter para nova linha · Enter para enviar
        </p>
      </div>
    </div>
  );
}
