import { describe, expect, it } from "vitest";
import type { DailyGoal } from "../../types/gamification.types";
import { consistencyWeeks, streakStanding, summarizeProgress } from "../progressSummary";

const TODAY = "2026-09-15";

/** Um dia de metas; o que não é dito fica sem meta e sem nada feito. */
function day(date: string, fields: Partial<DailyGoal> = {}): DailyGoal {
  return {
    id: date,
    student_id: "aluno-1",
    date,
    meals_completed: 0,
    meals_target: 0,
    workout_completed: 0,
    workout_target: 0,
    completion_percentage: 0,
    completed: false,
    created_at: `${date}T00:00:00Z`,
    ...fields,
  } as DailyGoal;
}

describe("summarizeProgress — treinos", () => {
  it("soma os treinos dos últimos 30 dias, hoje incluso, e compara com os 30 anteriores", () => {
    const goals = [
      day("2026-09-15", { workout_completed: 1 }),
      day("2026-08-17", { workout_completed: 2 }), // 29 dias antes: ainda no período
      day("2026-08-16", { workout_completed: 1 }), // 30 dias antes: período anterior
      day("2026-07-18", { workout_completed: 1 }), // 59 dias antes: período anterior
      day("2026-07-17", { workout_completed: 5 }), // 60 dias antes: fora dos dois
    ];

    const { workouts } = summarizeProgress(goals, TODAY);

    expect(workouts.value).toBe(3);
    expect(workouts.delta).toBe(1);
  });
});

describe("summarizeProgress — aderência", () => {
  it("é o percentual de refeições feitas sobre as planejadas, com o delta em pontos", () => {
    const goals = [
      day("2026-09-15", { meals_completed: 4, meals_target: 5 }),
      day("2026-09-14", { meals_completed: 5, meals_target: 5 }), // 90% no período
      day("2026-08-10", { meals_completed: 3, meals_target: 5 }), // 60% no anterior
    ];

    const { adherence } = summarizeProgress(goals, TODAY);

    expect(adherence.value).toBe(90);
    expect(adherence.delta).toBe(30);
  });

  // Comer além do planejado não é 120% de aderência ao plano.
  it("não passa de 100% quando se registra mais refeição do que o planejado", () => {
    const goals = [day("2026-09-15", { meals_completed: 7, meals_target: 5 })];

    expect(summarizeProgress(goals, TODAY).adherence.value).toBe(100);
  });

  // Sem plano não é 0% de aderência: é não haver o que aderir.
  it("é nula sem refeição planejada, e o delta também", () => {
    const goals = [day("2026-09-15", { workout_completed: 1 })];

    const { adherence } = summarizeProgress(goals, TODAY);

    expect(adherence.value).toBeNull();
    expect(adherence.delta).toBeNull();
  });
});

describe("summarizeProgress — dias top", () => {
  it("conta só o dia em que as duas metas existiam e foram batidas", () => {
    const goals = [
      day("2026-09-15", {
        workout_completed: 1,
        workout_target: 1,
        meals_completed: 5,
        meals_target: 5,
      }),
      day("2026-09-14", {
        workout_completed: 1,
        workout_target: 1,
        meals_completed: 4,
        meals_target: 5,
      }),
      // Sem meta de treino no dia: bater a de refeição sozinha não faz dia top.
      day("2026-09-13", {
        workout_completed: 0,
        workout_target: 0,
        meals_completed: 5,
        meals_target: 5,
      }),
    ];

    expect(summarizeProgress(goals, TODAY).topDays.value).toBe(1);
  });
});

describe("summarizeProgress — série de 8 semanas", () => {
  it("tem oito semanas de sete dias terminando hoje, da mais antiga à atual", () => {
    const goals = [
      day("2026-09-15", { workout_completed: 2 }), // semana atual: 09/09 a 15/09
      day("2026-09-08", { workout_completed: 1 }), // semana anterior
      day("2026-07-22", { workout_completed: 3 }), // a oitava semana: 22/07 a 28/07
      day("2026-07-21", { workout_completed: 9 }), // fora da série
    ];

    expect(summarizeProgress(goals, TODAY).workouts.spark).toEqual([3, 0, 0, 0, 0, 0, 1, 2]);
  });

  it("marca como nula a semana sem refeição planejada", () => {
    const goals = [day("2026-09-15", { meals_completed: 1, meals_target: 2 })];

    const { spark } = summarizeProgress(goals, TODAY).adherence;

    expect(spark).toEqual([null, null, null, null, null, null, null, 50]);
  });
});

describe("consistencyWeeks", () => {
  it("são 13 colunas de segunda a domingo, e a última é a semana de hoje", () => {
    const weeks = consistencyWeeks([], TODAY);

    expect(weeks).toHaveLength(13);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[12][0].date).toBe("2026-09-14"); // segunda da semana de hoje
    expect(weeks[0][0].date).toBe("2026-06-22");
  });

  it("marca os dias depois de hoje como futuros", () => {
    const week = consistencyWeeks([], TODAY)[12];

    expect(week.map((cell) => cell.future)).toEqual([false, false, true, true, true, true, true]);
  });

  it("gradua o dia: nada, algo feito, uma meta batida, as duas batidas", () => {
    const goals = [
      day("2026-09-14", { meals_completed: 1, meals_target: 5 }),
      day("2026-09-15", {
        workout_completed: 1,
        workout_target: 1,
        meals_completed: 2,
        meals_target: 5,
      }),
      day("2026-09-13", {
        workout_completed: 1,
        workout_target: 1,
        meals_completed: 5,
        meals_target: 5,
      }),
    ];

    const weeks = consistencyWeeks(goals, TODAY);

    expect(weeks[11][5].level).toBe(0); // sábado sem registro
    expect(weeks[11][6].level).toBe(3); // domingo, dia top
    expect(weeks[12][0].level).toBe(1);
    expect(weeks[12][1].level).toBe(2);
  });
});

describe("streakStanding", () => {
  it("diz quanto falta para empatar com o recorde", () => {
    expect(streakStanding({ current_streak: 12, longest_streak: 18 })).toEqual({
      current: 12,
      best: 18,
      toTie: 6,
    });
  });

  it("não falta nada quando a sequência atual é o recorde", () => {
    expect(streakStanding({ current_streak: 20, longest_streak: 20 }).toTie).toBe(0);
  });

  it("sem registro de sequência, tudo é zero", () => {
    expect(streakStanding(null)).toEqual({ current: 0, best: 0, toTie: 0 });
  });
});
