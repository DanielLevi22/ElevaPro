import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Dois defeitos que só apareceram exercitando a conversa inteira.
 */

let sessionState: unknown;
let phaseRow: unknown;
let filters: [string, unknown][];

const mockFrom = vi.fn((_table: string) => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.update = vi.fn(chain);
  builder.eq = vi.fn((column: string, value: unknown) => {
    filters.push([column, value]);
    return builder;
  });
  builder.single = vi.fn(async () => ({ data: { state: sessionState }, error: null }));
  builder.maybeSingle = vi.fn(async () => ({ data: phaseRow, error: null }));
  return builder;
});

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: (table: string) => mockFrom(table) },
}));

const { getSessionState, phaseOwnedBy } = await import("../chatService");

beforeEach(() => {
  vi.clearAllMocks();
  sessionState = {};
  phaseRow = { id: "fase-1" };
  filters = [];
});

describe("getSessionState", () => {
  // `state` nasce como `{}` no banco — um valor, não ausência. O `?? {...}`
  // anterior nunca disparava, `savedWorkouts` chegava indefinido, e o spread na
  // rota de salvar estourava DEPOIS de os treinos já terem sido gravados: 500
  // de corpo vazio, com o dado no banco e o especialista sem saber.
  it("devolve savedWorkouts mesmo com o state vazio do banco", async () => {
    const state = await getSessionState("s1");
    expect(state.savedWorkouts).toEqual([]);
  });

  it("preserva o que já estava guardado", async () => {
    sessionState = {
      savedWorkouts: [{ id: "w1", title: "Treino A", phaseId: "f1" }],
      pendingWorkoutProposal: { phase_id: "f1", phase_name: "Fase 1", workouts: [] },
    };

    const state = await getSessionState("s1");

    expect(state.savedWorkouts).toHaveLength(1);
    expect(state.pendingWorkoutProposal?.phase_name).toBe("Fase 1");
  });

  it("aguenta state nulo", async () => {
    sessionState = null;
    const state = await getSessionState("s1");
    expect(state.savedWorkouts).toEqual([]);
  });
});

describe("phaseOwnedBy", () => {
  const UUID_VALIDO = "1629a712-7e03-4f70-8aa8-2aa077791450";

  // O modelo emitiu "fase-1-adaptacao" como phase_id e a gravação morreu com
  // "invalid input syntax for type uuid".
  it("recusa id que não é uuid, sem consultar o banco", async () => {
    expect(await phaseOwnedBy("fase-1-adaptacao", "aluno", "espec")).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("recusa id vazio", async () => {
    expect(await phaseOwnedBy("", "aluno", "espec")).toBe(false);
  });

  // Um uuid válido de outra pessoa gravaria treino na fase dela: a rota de
  // salvar usa service_role e não passa pela RLS.
  it("exige que a fase seja do aluno com este especialista", async () => {
    await phaseOwnedBy(UUID_VALIDO, "aluno-1", "espec-1");

    expect(filters).toContainEqual(["id", UUID_VALIDO]);
    expect(filters).toContainEqual(["training_periodizations.student_id", "aluno-1"]);
    expect(filters).toContainEqual(["training_periodizations.specialist_id", "espec-1"]);
  });

  it("recusa quando a fase não é dessa dupla", async () => {
    phaseRow = null;
    expect(await phaseOwnedBy(UUID_VALIDO, "aluno-1", "espec-1")).toBe(false);
  });

  it("aceita a fase própria", async () => {
    expect(await phaseOwnedBy(UUID_VALIDO, "aluno-1", "espec-1")).toBe(true);
  });
});
