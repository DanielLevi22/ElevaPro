"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/modules/auth";
import { criarAcumuladorDeTexto } from "../services/acumuladorDeTexto";
import type { AiReadinessScore } from "../services/aiReadiness";
import type { ChatMessage, PlanProposalData, SseEvent } from "../types";

export interface SessionInfo {
  sessionId: string;
  coachMode: "express" | "analytical";
  personaTrack: string;
  profileSummary: Record<string, string | null>;
  readiness: AiReadinessScore;
  messageCount: number;
  messages: ChatMessage[];
  activePlan: { name: string; goal: string; status: string } | null;
  /** A proposta guardada no servidor: pendente, ou a última já salva. */
  planProposal: PlanProposalData | null;
  planSaved: boolean;
}

export interface PlanCard {
  data: PlanProposalData;
  savedId?: string;
}

export function useStudentCoach() {
  const session = useAuthStore((s) => s.session);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [planCard, setPlanCard] = useState<PlanCard | null>(null);
  /** O clique em Aprovar já está a caminho — o botão não pode disparar dois. */
  const [aprovando, setAprovando] = useState(false);
  const [coachStarted, setCoachStarted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/ai/student/coach/session", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data: SessionInfo) => {
        setSessionInfo(data);
        // O cartão vivia só na memória da tela: recarregar apagava a proposta e
        // o botão de confirmar junto, com ela guardada no servidor.
        if (data.planProposal) {
          setPlanCard({ data: data.planProposal, ...(data.planSaved ? { savedId: "salvo" } : {}) });
        }
        if (data.messageCount > 0) {
          setCoachStarted(true);
          setMessages(data.messages);
        }
      })
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, [session?.access_token]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || loading || !session?.access_token) return;

      setInput("");
      // O cartão sai da tela ao enviar, mas o que estava guardado no servidor
      // volta na próxima abertura — a decisão só some quando é tomada.
      setPlanCard(null);

      const assistantId = crypto.randomUUID();
      const texto = criarAcumuladorDeTexto((pedaco) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + pedaco } : m)),
        ),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: msg,
          createdAt: new Date().toISOString(),
        },
        { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
      ]);

      setLoading(true);
      try {
        const res = await fetch("/api/ai/student/coach/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: msg }),
        });
        if (res.body) await readSseStream(res.body);
      } finally {
        // O último pedaço chega depois do último quadro: sem isto a resposta
        // aparece truncada na tela e completa no histórico.
        texto.liberar();
        setLoading(false);
        inputRef.current?.focus();
      }

      function applySseLine(line: string) {
        if (!line.startsWith("data: ")) return;
        try {
          const event: SseEvent = JSON.parse(line.slice(6));
          if (event.type === "text") {
            texto.empurrar(event.content);
          } else if (event.type === "plan_proposal") {
            setPlanCard({ data: event.data });
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

      async function readSseStream(body: ReadableStream<Uint8Array>) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) applySseLine(line);
        }
      }
    },
    [input, loading, session?.access_token],
  );

  /**
   * Salva o plano guardado no servidor, não o que o modelo reemitir.
   *
   * Antes isto mandava a frase "Aprovado! Pode salvar o plano." pelo chat e
   * torcia para o modelo agir — o mesmo desenho que travou a periodização em
   * laço. Agora quem grava é a rota, com reivindicação atômica: dois cliques
   * gravam uma vez só.
   */
  async function approvePlan() {
    if (aprovando || !session?.access_token) return;

    setAprovando(true);
    try {
      const res = await fetch("/api/ai/student/coach/save-plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? "falha ao salvar");

      setPlanCard(null);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Pronto! Seu plano "${data.name}" está salvo. Bora começar?`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("[useStudentCoach] aprovar plano", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Não consegui salvar o plano agora. Tente de novo em instantes.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setAprovando(false);
    }
  }

  function rejectPlan() {
    setPlanCard(null);
    sendMessage("Quero ajustar o plano antes de salvar.");
  }

  function startCoach(mode?: "express" | "analytical") {
    if (mode && sessionInfo) {
      setSessionInfo((prev) => (prev ? { ...prev, coachMode: mode } : prev));
    }
    setCoachStarted(true);
    const greeting =
      (mode ?? sessionInfo?.coachMode) === "express"
        ? "Olá! Pode gerar meu plano agora com base no meu perfil."
        : "Olá! Quero conversar um pouco antes de montar meu plano.";
    sendMessage(greeting);
  }

  return {
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
    aprovando,
    rejectPlan,
    startCoach,
  };
}
