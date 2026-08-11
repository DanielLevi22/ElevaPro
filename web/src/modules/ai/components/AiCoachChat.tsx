"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import type { ChatMessage, PeriodizationProposal, SseEvent } from "../types";

interface Props {
  studentId: string;
}

interface PeriodizationCard {
  data: PeriodizationProposal;
  savedId?: string;
}

export function AiCoachChat({ studentId }: Props) {
  const session = useAuthStore((s) => s.session);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [proposal, setProposal] = useState<PeriodizationCard | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch(`/api/ai/chat/${studentId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) {
          setMessages(data.messages);
        } else {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Olá! Sou o AI Coach. Vou te ajudar a criar o planejamento de treino deste aluno. Por onde quer começar?",
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, [studentId, session?.access_token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, proposal]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading || !session?.access_token) return;

    setInput("");
    setProposal(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
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
        body: JSON.stringify({ message: msg }),
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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.content } : m,
                ),
              );
            } else if (event.type === "proposal") {
              setProposal({ data: event.data });
            } else if (event.type === "saved" && event.entity === "periodization") {
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
      setLoading(false);
      inputRef.current?.focus();
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

        {/* Periodization Proposal Card */}
        {proposal && (
          <div className="mx-auto max-w-lg">
            <div className="bg-surface border border-primary/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Proposta de Periodização</h4>
                {proposal.savedId ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                    ✓ Salvo
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    Aguardando aprovação
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nome</p>
                  <p className="text-foreground font-medium">{proposal.data.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Objetivo</p>
                  <p className="text-foreground font-medium">{proposal.data.goal}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Duração</p>
                  <p className="text-foreground font-medium">
                    {proposal.data.durationWeeks} semanas
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Nível</p>
                  <p className="text-foreground font-medium">{proposal.data.level}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Fases
                </p>
                {proposal.data.phases.map((phase, i) => (
                  <div
                    key={`${phase.name}-${i}`}
                    className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{phase.name}</p>
                      <p className="text-xs text-muted-foreground">{phase.focus}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {phase.weeks} sem
                    </span>
                  </div>
                ))}
              </div>

              {!proposal.savedId && (
                <div className="flex gap-2 pt-1">
                  <Button
                    fullWidth
                    size="sm"
                    onClick={() => sendMessage("Aprovado! Pode salvar a periodização.")}
                    disabled={loading}
                  >
                    Aprovar e Salvar
                  </Button>
                  <Button
                    fullWidth
                    size="sm"
                    variant="secondary"
                    onClick={() => sendMessage("Quero ajustar algumas coisas na proposta.")}
                    disabled={loading}
                  >
                    Ajustar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
