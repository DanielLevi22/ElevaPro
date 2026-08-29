import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O contexto que vai para o coach do próprio aluno.
 *
 * A anamnese chegava aqui crua, do jeito que estava na coluna. Como a tela do
 * aluno COM especialista gravava `{ questionId, value }`, todo campo virava
 * objeto — e o prompt interpola direto: `Lesões/Contraindicações: [object
 * Object]`. O aluno recebia orientação de um coach que não leu a lesão dele.
 */

const LESAO = "Hérnia de disco L5-S1 — proibido agachamento livre";

let tables: Record<string, { data: unknown; error: unknown }>;

const mockFrom = vi.fn((table: string) => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.select = vi.fn(chain);
  builder.single = vi.fn(async () => tables[table] ?? { data: null, error: null });
  builder.maybeSingle = vi.fn(async () => tables[table] ?? { data: null, error: null });
  // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve(tables[table] ?? { data: [], error: null });
  return builder;
});

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: (table: string) => mockFrom(table) },
}));

const { formatStudentCoachContext, loadStudentCoachContext } = await import(
  "../studentCoachContextLoader"
);

const PERFIL = {
  data: { full_name: "Aluno Teste", coach_mode: "express", persona_track: "beginner" },
  error: null,
};

/** A forma que a tela do aluno com especialista grava. */
const ANAMNESE_EMBRULHADA = {
  data: {
    responses: {
      main_goal: { questionId: "main_goal", value: "Hipertrofia" },
      injuries: { questionId: "injuries", value: LESAO },
      training_days: { questionId: "training_days", value: 4 },
    },
    completed_at: "2026-08-01",
  },
  error: null,
};

describe("contexto do coach do aluno", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables = {
      profiles: PERFIL,
      student_anamnesis: ANAMNESE_EMBRULHADA,
      physical_assessments: { data: null, error: null },
      training_plans: { data: null, error: null },
    };
  });

  it("achata a anamnese embrulhada ao montar o contexto", async () => {
    const ctx = await loadStudentCoachContext("aluno-1");

    expect(ctx.anamnesis).toEqual({
      main_goal: "Hipertrofia",
      injuries: LESAO,
      training_days: 4,
    });
  });

  // REGRESSÃO CLÍNICA: o prompt interpola o campo direto. Objeto interpolado
  // vira "[object Object]" — texto não vazio, que passa pelo `if (a.injuries)`
  // e chega ao modelo como se fosse a contraindicação do aluno.
  it("não deixa [object Object] chegar ao prompt", async () => {
    const prompt = formatStudentCoachContext(await loadStudentCoachContext("aluno-1"));

    expect(prompt).not.toContain("[object Object]");
    expect(prompt).toContain(LESAO);
  });
});
