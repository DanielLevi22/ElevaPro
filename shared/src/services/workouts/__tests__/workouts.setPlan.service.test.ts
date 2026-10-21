import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createWorkoutsService } from "../workouts.service";

describe("workoutsService — plano de séries do exercício", () => {
  const restPause = {
    methods: ["rest_pause"],
    reps: { mode: "failure" as const },
    weight_kg: 80,
    rest_seconds: 120,
    target_rir: 0,
    segments: [
      { reps: { mode: "count" as const, value: 4 }, weight_kg: 80, pause_seconds: 15, methods: [] },
    ],
  };

  it("grava o plano de séries que veio com o exercício", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).addExercisesToWorkout("t1", [
      { exercise_id: "e1", set_plan: [restPause] },
    ]);

    const linha = (chamadas[0].payload as Record<string, unknown>[])[0];
    expect(linha.set_plan).toEqual([restPause]);
  });

  it("recusa plano inválido antes de chegar ao banco", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await expect(
      createWorkoutsService(supabase).addExercisesToWorkout("t1", [
        { exercise_id: "e1", set_plan: [{ ...restPause, methods: ["bfr"] }] },
      ]),
    ).rejects.toThrow(/bfr/);
    expect(chamadas).toHaveLength(0);
  });

  it("editar com plano grava o plano conferido", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).updateWorkoutExercise("we1", { set_plan: [restPause] });

    expect(chamadas[0].payload).toEqual({ set_plan: [restPause] });
    expect(chamadas[0].filtros).toEqual({ id: "we1" });
  });

  it("editar com plano inválido não chega ao banco", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await expect(
      createWorkoutsService(supabase).updateWorkoutExercise("we1", {
        set_plan: Array(21).fill(restPause),
      }),
    ).rejects.toThrow(/21 séries/);
    expect(chamadas).toHaveLength(0);
  });
});

describe("workoutsService — item sem plano vindo do banco", () => {
  // Até a 0106, app antigo ainda cria item sem set_plan. Lido como nulo, ele
  // quebrava toda tela que resume o treino; vazio, a tela mostra zero séries
  // até o backfill rodar de novo.
  it("lê plano nulo como plano vazio", async () => {
    const { supabase } = criarSupabaseFake({
      data: {
        id: "t1",
        title: "Treino A",
        exercises: [{ id: "we1", order_index: 0, set_plan: null }],
      },
    });

    const treino = await createWorkoutsService(supabase).fetchWorkoutById("t1");

    expect(treino?.exercises?.[0]?.set_plan).toEqual([]);
  });

  it("nos treinos da fase, também", async () => {
    const { supabase } = criarSupabaseFake({
      data: [
        { id: "t1", title: "Treino A", exercises: [{ id: "we1", order_index: 0, set_plan: null }] },
      ],
    });

    const treinos = await createWorkoutsService(supabase).fetchWorkoutsByPlan("fase-1");

    expect(treinos[0]?.exercises?.[0]?.set_plan).toEqual([]);
  });
});
