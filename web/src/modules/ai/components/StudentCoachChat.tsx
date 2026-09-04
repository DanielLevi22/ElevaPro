"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/shared/components/ui/Button";
import { useStudentCoach } from "../hooks/useStudentCoach";
import { AiReadinessGate } from "./AiReadinessGate";
import { PlanProposalCard } from "./PlanProposalCard";
import { ProfileConfirmationCard } from "./ProfileConfirmationCard";

export function StudentCoachChat() {
  const {
    sessionInfo,
    messages,
    input,
    setInput,
    loading,
    initializing,
    planCard,
    coachStarted,
    inputRef,
    sendMessage,
    approvePlan,
    rejectPlan,
    startCoach,
  } = useStudentCoach();

  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: as dependências são o gatilho da rolagem, não insumo do corpo do efeito — rolar para o fim quando qualquer uma muda é o comportamento desejado
  useEffect(() => {
    // Sem animação enquanto a resposta chega: cada `smooth` reinicia o anterior
    // antes de terminar, e o texto treme em vez de fluir.
    bottomRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth" });
  }, [messages, planCard, loading]);

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Erro ao carregar sessão.
      </div>
    );
  }

  // Readiness gate — only block before first conversation
  if (!coachStarted && sessionInfo.readiness.level === "blocked") {
    return (
      <AiReadinessGate
        readiness={sessionInfo.readiness}
        onProceed={() => startCoach()}
        onCompleteProfile={() => {
          window.location.href = "/dashboard/profile/anamnesis";
        }}
      />
    );
  }

  // Profile confirmation — first visit, profile OK
  if (!coachStarted) {
    return (
      <ProfileConfirmationCard
        profileSummary={sessionInfo.profileSummary}
        coachMode={sessionInfo.coachMode}
        onConfirm={() => startCoach()}
        onChangeMode={(mode) => startCoach(mode)}
      />
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

        {planCard && (
          <PlanProposalCard
            data={planCard.data}
            loading={loading}
            onApprove={approvePlan}
            onReject={rejectPlan}
          />
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
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
