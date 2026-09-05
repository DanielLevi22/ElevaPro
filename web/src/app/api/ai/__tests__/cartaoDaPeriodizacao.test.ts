import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallHandler } from "@/modules/ai/orchestrators/base.orchestrator";
import type { SseEvent } from "@/modules/ai/types";

/**
 * O cartão de periodização depois que ela já foi salva.
 *
 * O modelo reapresentava a proposta no mesmo turno em que mandou salvar, e a
 * tela obedecia: o cartão voltava como "Aguardando aprovação", com o botão de
 * salvar, para uma periodização que já estava no banco. Quem tinha acabado de
 * aprovar via o próprio clique ser desfeito.
 */

/** O que o modelo aciona neste turno, na ordem. */
let ferramentasDoTurno: { name: string; input: unknown }[];
/** O que a ferramenta devolveu ao modelo — é aí que a recusa aparece. */
let respostasAoModelo: string[];

vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist: async () => ({
    ok: true,
    caller: { id: "esp-1", accountType: "specialist" },
  }),
}));

vi.mock("@/modules/ai/services/chatService", () => ({
  getOrCreateSession: async () => "sessao-1",
  sessionOwnedBy: async () => "sessao-1",
  getSessionMessages: async () => [],
  saveMessage: async () => "msg-1",
  updateMessage: async () => undefined,
  savePeriodization: async () => "periodizacao-1",
  updateSessionState: async () => undefined,
  phaseOwnedBy: async () => ({ id: "fase-1" }),
}));

vi.mock("@/modules/ai/services/contextLoader", () => ({
  loadStudentContext: async () => ({}),
  formatContextForPrompt: () => "contexto",
}));

vi.mock("@/modules/ai/services/bodyScanContext", () => ({
  formatBodyScanIndex: async () => "",
  queryBodyScan: async () => "{}",
}));

vi.mock("@/modules/ai/services/conversationTitle", () => ({
  definirTituloProvisorio: async () => undefined,
  nomearConversa: async () => undefined,
}));

vi.mock("@/modules/ai/services/exerciseCatalog", () => ({
  queryExercises: async () => ({ exercises: [], total: 0 }),
  unknownExerciseNames: async () => [],
}));

vi.mock("@/modules/ai/services/workoutOrchestrator", () => ({
  async *runWorkoutOrchestrator(
    _msg: string,
    _hist: unknown,
    _ctx: string,
    onToolCall: ToolCallHandler,
  ): AsyncGenerator<SseEvent> {
    for (const ferramenta of ferramentasDoTurno) {
      respostasAoModelo.push(await onToolCall(ferramenta.name, ferramenta.input));
    }
    yield { type: "done" };
  },
}));

const { POST } = await import("../chat/[studentId]/route");

const PROPOSTA = {
  name: "Hipertrofia 12 Semanas",
  goal: "Hipertrofia",
  durationWeeks: 12,
  startDate: "2026-10-01",
  level: "Intermediário",
  phases: [{ name: "Adaptação", weeks: 12, focus: "Volume" }],
};

async function eventosDoTurno(): Promise<SseEvent[]> {
  const request = new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify({ message: "Aprovado! Pode salvar." }),
  }) as unknown as NextRequest;

  const resposta = await POST(request, { params: Promise.resolve({ studentId: "aluno-1" }) });
  const corpo = await resposta.text();

  return corpo
    .split("\n\n")
    .filter((linha) => linha.startsWith("data: "))
    .map((linha) => JSON.parse(linha.slice(6)) as SseEvent);
}

beforeEach(() => {
  ferramentasDoTurno = [];
  respostasAoModelo = [];
});

describe("cartão da periodização", () => {
  it("mostra o cartão quando a proposta é nova", async () => {
    ferramentasDoTurno = [{ name: "propose_periodization", input: PROPOSTA }];

    const eventos = await eventosDoTurno();

    expect(eventos).toContainEqual({ type: "proposal", data: PROPOSTA });
  });

  it("não reapresenta o cartão depois de salvar no mesmo turno", async () => {
    ferramentasDoTurno = [
      { name: "propose_periodization", input: PROPOSTA },
      { name: "save_periodization", input: PROPOSTA },
      { name: "propose_periodization", input: PROPOSTA },
    ];

    const eventos = await eventosDoTurno();

    expect(eventos.filter((e) => e.type === "proposal")).toHaveLength(1);
    expect(eventos).toContainEqual({
      type: "saved",
      entity: "periodization",
      id: "periodizacao-1",
      name: PROPOSTA.name,
    });
  });

  // Recusar calado faria o modelo tentar de novo. Ele precisa saber que já está
  // salva e qual é o próximo passo.
  it("diz ao modelo que já está salva e manda seguir para os treinos", async () => {
    ferramentasDoTurno = [
      { name: "save_periodization", input: PROPOSTA },
      { name: "propose_periodization", input: PROPOSTA },
    ];

    await eventosDoTurno();

    expect(JSON.parse(respostasAoModelo[1])).toEqual({
      error: "Esta periodização já foi salva.",
      instrucao: "Não proponha de novo. Siga para os treinos da fase.",
    });
  });
});
