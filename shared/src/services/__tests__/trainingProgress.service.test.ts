import { describe, expect, it } from "vitest";
import { createTrainingProgressService } from "../trainingProgress.service";
import { criarSupabaseFake } from "./supabaseFake";

const SESSION = {
  id: "sessao-1",
  completed_at: new Date(2026, 8, 15, 23, 30).toISOString(),
  exercises: [
    {
      exercise_id: "agachamento",
      exercise: { name: "Agachamento livre", muscle_group: "Pernas" },
      sets: [
        { reps_actual: 5, weight_actual: 95, completed: true },
        { reps_actual: 5, weight_actual: 95, completed: false },
      ],
    },
    // Exercício apagado do catálogo: a série existe e não tem a quem pertencer.
    {
      exercise_id: null,
      exercise: null,
      sets: [{ reps_actual: 8, weight_actual: 40, completed: true }],
    },
  ],
};

describe("trainingProgressService — séries concluídas", () => {
  it("achata as sessões em séries concluídas, com o dia local em que a sessão terminou", async () => {
    const { supabase } = criarSupabaseFake({ data: [SESSION] });

    const sets = await createTrainingProgressService(supabase).listCompletedSets(
      "aluno-1",
      "2025-09-16",
    );

    expect(sets).toEqual([
      {
        date: "2026-09-15",
        sessionId: "sessao-1",
        exerciseId: "agachamento",
        exerciseName: "Agachamento livre",
        muscleGroup: "Pernas",
        reps: 5,
        weight: 95,
      },
    ]);
  });

  // Uma consulta só, e não três encadeadas: o hub abria com três idas ao banco e
  // uma lista de ids na URL que crescia com o histórico do aluno.
  it("lê as sessões concluídas do aluno desde a data, numa consulta, só com as colunas usadas", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });

    await createTrainingProgressService(supabase).listCompletedSets("aluno-1", "2025-09-16");

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].tabela).toBe("workout_sessions");
    expect(chamadas[0].select).not.toContain("*");
    expect(chamadas[0].select).not.toContain("notes");
    expect(chamadas[0].filtros.student_id).toBe("aluno-1");
    expect(chamadas[0].filtros.completed_at).toBe(new Date(2025, 8, 16).toISOString());
  });

  it("propaga o erro da consulta", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "falhou" } });

    await expect(
      createTrainingProgressService(supabase).listCompletedSets("aluno-1", "2025-09-16"),
    ).rejects.toEqual({ message: "falhou" });
  });
});
