import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ChamadaRegistrada,
  criarSupabaseFake,
} from "../../../../../../shared/src/services/__tests__/supabaseFake";

let fake: ReturnType<typeof criarSupabaseFake>;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => fake.supabase,
}));

const { importWorkoutAction } = await import("../actions");

const restPause = {
  methods: ["rest_pause"],
  reps: { mode: "failure" },
  weight_kg: 80,
  rest_seconds: 120,
  target_rir: 0,
  segments: [{ reps: { mode: "count", value: 4 }, weight_kg: 80, pause_seconds: 15 }],
};

const insercaoDosItens = (chamadas: ChamadaRegistrada[]) =>
  chamadas.find(
    (c) => c.tabela === "workout_exercises" && c.metodos.some((m) => m.nome === "insert"),
  );

describe("importWorkoutAction — treino da biblioteca para a fase", () => {
  beforeEach(() => {
    fake = criarSupabaseFake(
      [
        { data: { id: "origem", title: "Treino A" } },
        { data: { id: "copia" } },
        {
          data: [
            {
              exercise_id: "agachamento",
              order_index: 0,
              sets: 1,
              reps: "falha",
              weight: "80",
              rest_seconds: 120,
              notes: null,
              set_plan: [restPause],
            },
          ],
        },
        {},
      ],
      { auth: { getUser: async () => ({ data: { user: { id: "especialista" } } }) } },
    );
  });

  // Regressão (#431): a cópia listava as colunas à mão e deixava o plano de
  // fora — o rest-pause importado chegava como série Normal.
  it("a cópia leva o plano de séries do treino de origem", async () => {
    await importWorkoutAction("origem", "fase-1");

    const linhas = insercaoDosItens(fake.chamadas)?.payload as Record<string, unknown>[];
    expect(linhas?.[0]).toMatchObject({ workout_id: "copia", set_plan: [restPause] });
  });
});
