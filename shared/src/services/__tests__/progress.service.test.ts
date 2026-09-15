import { describe, expect, it } from "vitest";
import { createProgressService } from "../progress.service";
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

describe("progressService — séries concluídas", () => {
  it("achata as sessões em séries concluídas, com o dia local em que a sessão terminou", async () => {
    const { supabase } = criarSupabaseFake({ data: [SESSION] });

    const sets = await createProgressService(supabase).listCompletedSets("aluno-1", "2025-09-16");

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

    await createProgressService(supabase).listCompletedSets("aluno-1", "2025-09-16");

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
      createProgressService(supabase).listCompletedSets("aluno-1", "2025-09-16"),
    ).rejects.toEqual({ message: "falhou" });
  });
});

describe("progressService — histórico de atividade", () => {
  it("devolve o dia local de cada sessão concluída e as refeições registradas como feitas", async () => {
    const { supabase } = criarSupabaseFake([
      { data: [{ completed_at: new Date(2026, 8, 15, 23, 30).toISOString() }] },
      { data: [{ logged_date: "2026-09-15", diet_meal_id: "cafe" }] },
    ]);

    const history = await createProgressService(supabase).listActivityHistory("aluno-1");

    expect(history).toEqual({
      sessionDates: ["2026-09-15"],
      mealLogs: [{ logged_date: "2026-09-15", diet_meal_id: "cafe", completed: true }],
    });
  });

  // O recorde da sequência precisa do histórico inteiro, e o PostgREST corta em
  // 1.000 linhas: sem paginar, quem registra quatro refeições por dia perdia o
  // recorde depois de oito meses, sem aviso.
  it("lê página por página até a última vir incompleta", async () => {
    const fullPage = Array.from({ length: 1000 }, () => ({ completed_at: "2026-09-15T12:00:00Z" }));
    // As duas leituras saem juntas: a segunda página das sessões é a terceira consulta.
    const { supabase, chamadas } = criarSupabaseFake([
      { data: fullPage },
      { data: [] },
      { data: [{ completed_at: "2026-09-14T12:00:00Z" }] },
    ]);

    const history = await createProgressService(supabase).listActivityHistory("aluno-1");

    expect(history.sessionDates).toHaveLength(1001);
    expect(chamadas[2].metodos.find((m) => m.nome === "range")?.args).toEqual([1000, 1999]);
  });

  it("pede só as datas: nada de conteúdo da sessão ou da refeição", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });

    await createProgressService(supabase).listActivityHistory("aluno-1");

    expect(chamadas.map((c) => [c.tabela, c.select])).toEqual([
      ["workout_sessions", "completed_at"],
      ["meal_logs", "logged_date, diet_meal_id"],
    ]);
    expect(chamadas[1].filtros).toMatchObject({ student_id: "aluno-1", completed: true });
  });
});

describe("progressService — esboço do plano ativo", () => {
  it("devolve o tipo, o início e as refeições com o dia da semana, numa consulta", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: {
        plan_type: "cyclic",
        start_date: "2026-09-01",
        meals: [{ id: "cafe", day_of_week: 1 }],
      },
    });

    const outline = await createProgressService(supabase).getMealPlanOutline("aluno-1");

    expect(outline).toEqual({
      plan: { plan_type: "cyclic", start_date: "2026-09-01" },
      meals: [{ id: "cafe", day_of_week: 1 }],
    });
    expect(chamadas[0].tabela).toBe("diet_plans");
    expect(chamadas[0].select).not.toContain("*");
    expect(chamadas[0].filtros).toMatchObject({ student_id: "aluno-1", status: "active" });
  });

  it("sem plano ativo, não há plano nem refeição", async () => {
    const { supabase } = criarSupabaseFake({ data: null });

    await expect(createProgressService(supabase).getMealPlanOutline("aluno-1")).resolves.toEqual({
      plan: null,
      meals: [],
    });
  });
});
