import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallHandler } from "@/modules/ai/orchestrators/base.orchestrator";
import type { PlanProposalData, SseEvent } from "@/modules/ai/types";

vi.mock("@/lib/ai-route", () => ({ rotaDeIA: (handler: unknown) => handler }));

/**
 * O que `propose_plan` deixa guardado no servidor.
 *
 * É o que o botão Aprovar salva. A gravação em si mudou de lugar — saiu da
 * ferramenta `save_plan` e foi para a rota `save-plan`, testada em
 * `aprovarPlanoDoAluno.test.ts` — mas guardar a proposta continua sendo
 * condição para tudo: sem ela, o botão não tem o que salvar.
 */

const PLANO = {
  workout: {
    split_name: "Push Pull Legs",
    goal: "hipertrofia",
    duration_weeks: 12,
    level: "intermediate",
    days: [{ day_label: "A", muscle_groups: ["peito"] }],
  },
  nutrition: { calories: 2400 },
} as unknown as PlanProposalData;

let estado: Record<string, unknown>;
let ferramentasDoTurno: { name: string; input: unknown }[];
let respostas: string[];

// O `ai.config` instancia o cliente da Anthropic no import: sem chave, ele
// lança antes de qualquer teste rodar.
vi.mock("@/modules/ai/ai.config", () => ({ aiProviders: { reasoning: {}, fast: {} } }));

vi.mock("@/lib/api-auth", () => ({
  authorizeStudent: async () => ({ ok: true, caller: { id: "aluno-1", accountType: "student" } }),
  authorizeStudentWithHealthConsent: async () => ({
    ok: true,
    caller: { id: "aluno-1", accountType: "student" },
  }),
}));

vi.mock("@/modules/ai/services/chatService", () => ({
  getSessionState: async () => estado,
  updateSessionState: async (_id: string, patch: Record<string, unknown>) => {
    estado = { ...estado, ...patch };
  },
  updateMessage: async () => undefined,
}));

vi.mock("@/modules/ai/services/studentCoachService", () => ({
  getOrCreateStudentCoachSession: async () => "sessao-1",
  getStudentSessionMessages: async () => [],
  // Devolve id porque a resposta do coach nasce na primeira palavra e é
  // reescrita durante o turno.
  saveStudentMessage: async () => "msg-1",
  saveStudentCoachPlan: async () => "periodizacao-1",
}));

vi.mock("@/modules/ai/services/studentCoachContextLoader", () => ({
  loadStudentCoachContext: async () => ({ coachMode: "express", personaTrack: "beginner" }),
  formatStudentCoachContext: () => "contexto",
}));

vi.mock("@/modules/ai/orchestrators/student-coach.orchestrator", () => ({
  StudentCoachOrchestrator: class {
    async *run({ onToolCall }: { onToolCall: ToolCallHandler }): AsyncGenerator<SseEvent> {
      for (const f of ferramentasDoTurno) respostas.push(await onToolCall(f.name, f.input));
      yield { type: "done" };
    }
  },
}));

const { POST } = await import("../student/coach/message/route");

async function turno(): Promise<SseEvent[]> {
  const request = new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify({ message: "vai" }),
  }) as unknown as NextRequest;

  const corpo = await (await POST(request)).text();
  return corpo
    .split("\n\n")
    .filter((l) => l.startsWith("data: "))
    .map((l) => JSON.parse(l.slice(6)) as SseEvent);
}

beforeEach(() => {
  estado = { savedWorkouts: [] };
  ferramentasDoTurno = [];
  respostas = [];
});

describe("plano do aluno", () => {
  it("guarda a proposta ao apresentá-la, e mostra o cartão", async () => {
    ferramentasDoTurno = [{ name: "propose_plan", input: PLANO }];

    const eventos = await turno();

    expect(estado.pendingStudentPlan).toEqual(PLANO);
    expect(eventos).toContainEqual({ type: "plan_proposal", data: PLANO });
  });

  // O ponto: o que grava é a cópia guardada, não o que o modelo mandar agora.
});
