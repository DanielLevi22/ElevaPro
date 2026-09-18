import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallHandler } from "@/modules/ai/orchestrators/base.orchestrator";
import type { SseEvent } from "@/modules/ai/types";

vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));

/**
 * O que a proposta de periodização deixa no servidor.
 *
 * O defeito que isto trava: propor não guardava nada. O histórico que o modelo
 * relê tem só texto — chamada de ferramenta e resultado não são gravados —,
 * então no turno seguinte ele não tinha nome, semanas, data nem fases para
 * salvar. Para reconstruir, propunha de novo; a rota respondia "aguardando
 * aprovação"; e ele pedia que se aprovasse outra vez. Clicar em Aprovar nunca
 * salvava nada.
 */

/** O que o modelo aciona neste turno, na ordem. */
let ferramentasDoTurno: { name: string; input: unknown }[];
/** O que a ferramenta devolveu ao modelo — é aí que a recusa aparece. */
let respostasAoModelo: string[];
/** O `state` da conversa, como o banco o veria. */
let estado: Record<string, unknown>;

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
  getSessionState: async () => estado,
  updateSessionState: async (_id: string, patch: Record<string, unknown>) => {
    estado = { ...estado, ...patch };
  },
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
    body: JSON.stringify({ message: "monta a periodização" }),
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
  estado = { savedWorkouts: [] };
});

describe("cartão da periodização", () => {
  it("mostra o cartão quando a proposta é nova", async () => {
    ferramentasDoTurno = [{ name: "propose_periodization", input: PROPOSTA }];

    const eventos = await eventosDoTurno();

    expect(eventos).toContainEqual({ type: "proposal", data: PROPOSTA });
  });

  // O ponto do conserto: sem a cópia guardada, o botão Aprovar não tem o que
  // salvar, e o assistente não tem como reconstruir a proposta.
  it("guarda a proposta no servidor, que é o que o botão Aprovar salva", async () => {
    ferramentasDoTurno = [{ name: "propose_periodization", input: PROPOSTA }];

    await eventosDoTurno();

    expect(estado.pendingPeriodization).toEqual(PROPOSTA);
  });

  // "Salvando agora!" e nada acontecendo é o que fazia o especialista clicar em
  // Aprovar de novo, e de novo.
  it("manda o modelo esperar em vez de anunciar que vai salvar", async () => {
    ferramentasDoTurno = [{ name: "propose_periodization", input: PROPOSTA }];

    await eventosDoTurno();

    const resposta = JSON.parse(respostasAoModelo[0]);
    expect(resposta.success).toBe(true);
    expect(resposta.instrucao).toContain("cartão");
  });

  // Recusar calado faria o modelo tentar de novo. Ele precisa saber que já está
  // salva e qual é o próximo passo.
  it("recusa propor de novo depois de aprovada, e diz o que fazer", async () => {
    estado = {
      savedWorkouts: [],
      resolvedPeriodization: { proposal: PROPOSTA, id: "periodizacao-1" },
    };
    ferramentasDoTurno = [{ name: "propose_periodization", input: PROPOSTA }];

    const eventos = await eventosDoTurno();

    expect(JSON.parse(respostasAoModelo[0])).toEqual({
      error: "Esta periodização já foi salva.",
      instrucao: "Não proponha de novo. Siga para os treinos da fase.",
    });
    // E o cartão não renasce como "aguardando aprovação" na tela de quem já
    // aprovou.
    expect(eventos.filter((e) => e.type === "proposal")).toHaveLength(0);
  });

  // A aprovação mora na rota, não numa frase do chat. Enquanto a ferramenta
  // existisse, ela seria um segundo caminho de gravação sem reivindicação.
  it("salvar deixou de ser ferramenta do modelo", async () => {
    ferramentasDoTurno = [{ name: "save_periodization", input: PROPOSTA }];

    await eventosDoTurno();

    expect(JSON.parse(respostasAoModelo[0])).toEqual({ error: "unknown tool" });
  });
});
