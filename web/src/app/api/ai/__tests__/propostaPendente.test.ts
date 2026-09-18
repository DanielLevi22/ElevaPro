import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));

/**
 * A proposta pendente sobrevive a sair da tela e voltar.
 *
 * O servidor sempre soube: `propose_workouts` grava em
 * `ai_chat_sessions.state.pendingWorkoutProposal` antes de emitir o cartão, e é
 * essa cópia que a aprovação salva. Quem esquecia era o cliente, que guardava o
 * cartão só em estado do React — recarregar apagava a proposta da tela, com o
 * botão de aprovar junto, e ela seguia viva no banco sem caminho de acesso.
 */

const PROPOSTA = {
  phase_id: "fase-1",
  phase_name: "Base Aeróbia e Resistência",
  workouts: [{ title: "Treino A — Full Body", exercises: [] }],
};

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
  getSessionMessages: async () => [{ id: "m1", role: "assistant", content: "oi" }],
  getSessionState: async () => estado,
  saveMessage: async () => undefined,
  savePeriodization: async () => "p1",
  updateSessionState: async () => undefined,
  phaseOwnedBy: async () => ({ id: "fase-1" }),
}));

vi.mock("@/modules/ai/services/contextLoader", () => ({
  loadStudentContext: async () => ({
    studentId: "aluno-1",
    health: {},
    healthUnavailableReason: null,
    periodizations: [],
  }),
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
  runWorkoutOrchestrator: async function* () {},
}));

const { GET } = await import("../chat/[studentId]/route");

/** O handler lê `nextUrl`, que é do `NextRequest` e não existe no `Request`. */
function pedido(): NextRequest {
  const url = "https://x/api/ai/chat/aluno-1";
  const request = new Request(url, { headers: { authorization: "Bearer t" } });
  return Object.assign(request, { nextUrl: new URL(url) }) as unknown as NextRequest;
}

const abrirConversa = async () =>
  (await GET(pedido(), { params: Promise.resolve({ studentId: "aluno-1" }) })).json();

beforeEach(() => {
  estado = { savedWorkouts: [] };
});

describe("abrir a conversa", () => {
  it("devolve a proposta que ficou esperando decisão, sem nada marcado", async () => {
    estado = { savedWorkouts: [], pendingWorkoutProposal: PROPOSTA };

    expect(await abrirConversa()).toMatchObject({
      workoutProposal: PROPOSTA,
      savedWorkoutTitles: [],
    });
  });

  it("devolve null quando não há proposta nenhuma", async () => {
    expect(await abrirConversa()).toMatchObject({ workoutProposal: null });
  });

  // A aprovação limpa a pendente — e precisa limpar, senão um segundo clique
  // salvaria os mesmos treinos. Sem guardar a resolvida, a conversa ficava
  // dizendo "aprovados e salvos: A, B, C" com a tela sem nada para mostrar.
  it("devolve a proposta já aprovada, com os treinos que foram salvos", async () => {
    estado = {
      savedWorkouts: [],
      resolvedWorkoutProposal: { proposal: PROPOSTA, savedTitles: ["Treino A — Full Body"] },
    };

    expect(await abrirConversa()).toMatchObject({
      workoutProposal: PROPOSTA,
      savedWorkoutTitles: ["Treino A — Full Body"],
    });
  });

  // Decisão pendente ganha da lembrança: é ela que precisa de ação.
  it("prefere a pendente à resolvida quando existem as duas", async () => {
    const outra = { ...PROPOSTA, phase_name: "Intensificação" };
    estado = {
      savedWorkouts: [],
      pendingWorkoutProposal: outra,
      resolvedWorkoutProposal: { proposal: PROPOSTA, savedTitles: ["Treino A — Full Body"] },
    };

    expect(await abrirConversa()).toMatchObject({
      workoutProposal: outra,
      savedWorkoutTitles: [],
    });
  });

  it("continua devolvendo o histórico e a disponibilidade", async () => {
    const corpo = await abrirConversa();

    expect(corpo.messages).toHaveLength(1);
    expect(corpo.availability).toHaveLength(4);
  });
});
