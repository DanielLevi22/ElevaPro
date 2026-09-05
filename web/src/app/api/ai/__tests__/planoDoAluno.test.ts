import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallHandler } from "@/modules/ai/orchestrators/base.orchestrator";
import type { PlanProposalData, SseEvent } from "@/modules/ai/types";

/**
 * O plano que o aluno aprova é o plano que fica gravado.
 *
 * `save_plan` gravava o que o modelo reemitia no segundo turno, e não a
 * proposta que o aluno viu no cartão — uma periodização de doze semanas com
 * quatro dias tem espaço de sobra para as duas versões divergirem. E nada
 * impedia salvar duas vezes: insistir gravava outra periodização ativa para o
 * mesmo aluno.
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

/** O que o modelo tentaria reemitir na hora de salvar — nunca deve ser gravado. */
const PLANO_REEMITIDO = {
  ...PLANO,
  workout: { ...PLANO.workout, split_name: "Outro treino" },
} as PlanProposalData;

let estado: Record<string, unknown>;
let gravado: { workout: { split_name: string } } | null;
let ferramentasDoTurno: { name: string; input: unknown }[];
let respostas: string[];

// O `ai.config` instancia o cliente da Anthropic no import: sem chave, ele
// lança antes de qualquer teste rodar.
vi.mock("@/modules/ai/ai.config", () => ({ aiProviders: { reasoning: {}, fast: {} } }));

vi.mock("@/lib/api-auth", () => ({
  authorizeStudent: async () => ({ ok: true, caller: { id: "aluno-1", accountType: "student" } }),
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
  saveStudentCoachPlan: async (
    _studentId: string,
    _sessionId: string,
    workout: { split_name: string },
  ) => {
    gravado = { workout };
    return "periodizacao-1";
  },
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
  gravado = null;
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
  it("salva a proposta guardada, não a que o modelo reemite", async () => {
    ferramentasDoTurno = [
      { name: "propose_plan", input: PLANO },
      { name: "save_plan", input: PLANO_REEMITIDO },
    ];

    await turno();

    expect(gravado?.workout.split_name).toBe("Push Pull Legs");
  });

  it("aprovar duas vezes grava uma vez só", async () => {
    ferramentasDoTurno = [
      { name: "propose_plan", input: PLANO },
      { name: "save_plan", input: PLANO },
    ];
    await turno();
    gravado = null;

    ferramentasDoTurno = [{ name: "save_plan", input: PLANO }];
    await turno();

    expect(gravado).toBeNull();
    expect(JSON.parse(respostas.at(-1) as string)).toMatchObject({
      error: "Este plano já foi salvo.",
      plan_id: "periodizacao-1",
    });
  });

  it("salvar tira da fila e guarda para a tela poder mostrar", async () => {
    ferramentasDoTurno = [
      { name: "propose_plan", input: PLANO },
      { name: "save_plan", input: PLANO },
    ];

    await turno();

    expect(estado.pendingStudentPlan).toBeUndefined();
    expect(estado.resolvedStudentPlan).toEqual({ plan: PLANO, periodizationId: "periodizacao-1" });
  });

  it("salvar sem proposta nenhuma diz o que fazer, em vez de gravar", async () => {
    ferramentasDoTurno = [{ name: "save_plan", input: PLANO }];

    await turno();

    expect(gravado).toBeNull();
    expect(JSON.parse(respostas[0])).toMatchObject({
      error: "Nenhum plano pendente para salvar. Apresente um com 'propose_plan' antes.",
    });
  });
});
