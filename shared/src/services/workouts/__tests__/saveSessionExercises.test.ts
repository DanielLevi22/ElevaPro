import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createWorkoutsService } from "../workouts.service";

describe("gravar os exercícios da sessão", () => {
  it("grava o esforço de cada exercício, e nulo quando a pessoa pulou a pergunta", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: [{ id: "se-1" }, { id: "se-2" }] },
      { data: [] },
    ]);

    await createWorkoutsService(supabase).saveSessionExercises("sessao-1", [
      { workout_exercise_id: "item-1", exercise_id: "ex-1", effort: "easy", sets: [] },
      { workout_exercise_id: "item-2", exercise_id: "ex-2", sets: [] },
    ]);

    expect(chamadas[0].tabela).toBe("workout_session_exercises");
    expect(chamadas[0].payload).toEqual([
      {
        session_id: "sessao-1",
        workout_exercise_id: "item-1",
        exercise_id: "ex-1",
        effort: "easy",
      },
      { session_id: "sessao-1", workout_exercise_id: "item-2", exercise_id: "ex-2", effort: null },
    ]);
  });
});
