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
    segments: [{ reps: { mode: "count" as const, value: 4 }, weight_kg: 80, pause_seconds: 15 }],
  };

  it("grava o plano de séries que veio com o exercício", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).addExercisesToWorkout("t1", [
      { exercise_id: "e1", set_plan: [restPause] },
    ]);

    const linha = (chamadas[0].payload as Record<string, unknown>[])[0];
    expect(linha.set_plan).toEqual([restPause]);
  });

  // Até os editores gravarem o plano (fatias 2 e 4), o formato achatado é a
  // fonte. Preencher o plano na gravação mantém a coluna sempre cheia, e as
  // telas novas não precisam saber de onde o item veio.
  it("sem plano, grava o plano convertido do formato achatado", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).addExercisesToWorkout("t1", [
      { exercise_id: "e1", sets: 2, reps: "8-12", weight: "30", rest_seconds: 90 },
    ]);

    const linha = (chamadas[0].payload as Record<string, unknown>[])[0];
    const serie = {
      methods: ["working"],
      reps: { mode: "range", min: 8, max: 12 },
      weight_kg: 30,
      rest_seconds: 90,
      target_rir: null,
      segments: [],
    };
    expect(linha.set_plan).toEqual([serie, serie]);
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

  // Editar só o achatado deixaria o plano gravado contando outra história.
  // Zerado, ele volta a ser derivado do achatado por `resolveSetPlan`.
  it("editar séries pelo formato achatado descarta o plano antigo", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).updateWorkoutExercise("we1", { sets: 5 });

    expect(chamadas[0].payload).toEqual({ sets: 5, set_plan: null });
    expect(chamadas[0].filtros).toEqual({ id: "we1" });
  });

  it("editar com plano grava o plano conferido", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).updateWorkoutExercise("we1", { set_plan: [restPause] });

    expect(chamadas[0].payload).toEqual({ set_plan: [restPause] });
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
