"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { criarAcumuladorDeTexto } from "../services/acumuladorDeTexto";
import { dispensar, foiDispensada } from "../services/propostaDispensada";
import type { ChatMessage, DietMealsProposal, DietPlanProposal, SseEvent } from "../types";
import { DietMealsProposalCard, DietPlanProposalCard } from "./DietProposalCards";
import { PainelDeProposta } from "./PainelDeProposta";

interface Props {
  studentId: string;
  /** Qual conversa abrir. `null` retoma a mais recente, como antes da lateral. */
  sessionId: string | null;
  /** A conversa que o servidor de fato abriu — pode ser uma criada agora. */
  onSessionResolved: (sessionId: string) => void;
  /** Algo mudou o que a lista mostra: mensagem nova, ordem, título. */
  onConversationChanged: () => void;
}

const BASE = "/api/ai/nutrition/chat";

export function NutritionCoachChat({
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
  const [planProposal, setPlanProposal] = useState<DietPlanProposal | null>(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [mealsProposal, setMealsProposal] = useState<DietMealsProposal | null>(null);
  const [mealsSaved, setMealsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  /** O que o coach está fazendo agora — o turno inteiro, não só na ferramenta. */
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

    const url = sessionId ? `${BASE}/${studentId}?sessionId=${sessionId}` : `${BASE}/${studentId}`;

    fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelado) return;
        if (data.sessionId) onSessionResolved(data.sessionId);
        // Mesmo motivo do chat de treino: proposta guardada no servidor volta
        // para a tela ao abrir, em vez de sumir com o botão de aprovar.
        const planoSalvo = Boolean(data.planSaved);
        const refeicoesSalvas = Boolean(data.mealsSaved);
        const jaDispensou = data.sessionId ? foiDispensada(data.sessionId) : false;

        setPlanSaved(planoSalvo);
        setPlanProposal(planoSalvo && jaDispensou ? null : (data.planProposal ?? null));
        setMealsSaved(refeicoesSalvas);
        setMealsProposal(refeicoesSalvas && jaDispensou ? null : (data.mealsProposal ?? null));
        setMessages(
          data.messages?.length
            ? data.messages
            : [
                {
                  id: "welcome",
                  role: "assistant",
                  content:
                    "Olá! Vou te ajudar a montar o plano alimentar deste aluno. Começamos pelo objetivo?",
                  createdAt: new Date().toISOString(),
                },
              ],
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setInitializing(false);
      });

    return () => {
      cancelado = true;
    };
  }, [studentId, session?.access_token, sessionId, onSessionResolved]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: as dependências são o gatilho da rolagem, não insumo do corpo do efeito — rolar para o fim quando qualquer uma muda é o comportamento desejado
  useEffect(() => {
    // Sem animação durante o streaming: cada `smooth` reinicia o anterior e o
    // texto treme em vez de fluir.
    bottomRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth" });
  }, [messages, planProposal, mealsProposal, activity, loading]);

  function appendAssistant(content: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content, createdAt: new Date().toISOString() },
    ]);
  }

  /** Salva a cópia guardada no servidor, não a que está na tela. */
  async function approve(endpoint: "save-plan" | "save-meals") {
    if (saving || !session?.access_token) return;

    setSaving(true);
    try {
      const res = await fetch(`${BASE}/${studentId}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        // Qual conversa: a proposta guardada vive no `state` desta, e sem o id
        // o servidor aprovava contra a mais recente do módulo — respondendo
        // "nenhuma proposta pendente" com a proposta na tela.
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "falha ao salvar");

      if (endpoint === "save-plan") {
        setPlanSaved(true);
        appendAssistant(`Pronto! Plano "${data.name}" salvo. Vamos montar as refeições?`);
      } else {
        setMealsSaved(true);
        const n = (data.saved ?? []).length;
        appendAssistant(`Pronto! ${n === 1 ? "1 refeição salva" : `${n} refeições salvas`}.`);
      }
    } catch (err) {
      console.error("[NutritionCoachChat]", endpoint, err);
      appendAssistant("Não consegui salvar agora. Tente de novo em instantes.");
    } finally {
      setSaving(false);
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
    const assistantId = crypto.randomUUID();
    const texto = criarAcumuladorDeTexto((pedaco) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + pedaco } : m)),
      ),
    );
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const response = await fetch(`${BASE}/${studentId}`, {
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
            } else if (event.type === "tool_start") {
              setActivity(event.label);
            } else if (event.type === "tool_end") {
              setActivity(null);
            } else if (event.type === "diet_plan_proposal") {
              setPlanProposal(event.data);
              setPlanSaved(false);
            } else if (event.type === "diet_meals_proposal") {
              setMealsProposal(event.data);
              setMealsSaved(false);
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: event.message } : m)),
              );
            }
          } catch {
            // chunk SSE malformado — ignora
          }
        }
      }
    } finally {
      // O último pedaço chega depois do último quadro.
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
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Carregando histórico...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-125 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="mt-0.5 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                AI
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm border border-white/10 bg-surface text-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Só enquanto uma ferramenta que grava está rodando. Enquanto o modelo
            apenas escreve, quem indica que ele trabalha são os pontinhos dentro
            da própria bolha — dois indicadores ao mesmo tempo, e um deles
            dizendo "preparando" sem nada ter ido ao servidor, pareciam defeito.

            O orquestrador só emite `tool_start` para o que grava, então esta
            condição não precisa saber quais ferramentas são quais. */}
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

      {/* Proposta pendente mora fora da lista: é ação esperando decisão, não
          mensagem. Dentro dela era só o último item, e texto novo entrava
          antes — o mesmo que já tirou o cartão de treino de lá. */}
      {planProposal && (
        <PainelDeProposta
          titulo="Metas do plano"
          resolvido={planSaved}
          onFechar={() => {
            if (sessionId) dispensar(sessionId);
            setPlanProposal(null);
          }}
        >
          <DietPlanProposalCard
            data={planProposal}
            saved={planSaved}
            loading={saving}
            onApprove={() => approve("save-plan")}
            onAdjust={() => sendMessage("Quero ajustar as metas do plano.")}
          />
        </PainelDeProposta>
      )}

      {mealsProposal && (
        <PainelDeProposta
          titulo="Refeições do plano"
          resolvido={mealsSaved}
          onFechar={() => {
            if (sessionId) dispensar(sessionId);
            setMealsProposal(null);
          }}
        >
          <DietMealsProposalCard
            data={mealsProposal}
            saved={mealsSaved}
            loading={saving}
            onApprove={() => approve("save-meals")}
            onAdjust={() => sendMessage("Quero ajustar as refeições.")}
          />
        </PainelDeProposta>
      )}

      <div className="border-t border-white/10 pt-4">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva sua mensagem..."
            rows={1}
            disabled={loading}
            className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <Button onClick={() => sendMessage()} isLoading={loading} disabled={!input.trim()}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
