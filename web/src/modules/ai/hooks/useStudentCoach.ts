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

  function approvePlan() {
    sendMessage("Aprovado! Pode salvar o plano.");
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
    rejectPlan,
    startCoach,
  };
}
