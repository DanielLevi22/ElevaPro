import { describe, expect, it } from "vitest";
import type { DailyActivity } from "../dailyActivity";
import { activityStreak, consistencyWeeks, summarizeProgress } from "../progressSummary";

const TODAY = "2026-09-15";

/** Um dia; o que não é dito fica sem sessão, sem plano e sem registro. */
function day(date: string, fields: Partial<DailyActivity> = {}): DailyActivity {
  return { date, workouts: 0, plannedMeals: 0, doneMeals: 0, loggedMeals: 0, ...fields };
}

describe("summarizeProgress — treinos", () => {
  it("soma as sessões dos últimos 30 dias, hoje incluso, e compara com os 30 anteriores", () => {
    const days = [
      day("2026-09-15", { workouts: 1 }),
      day("2026-08-17", { workouts: 2 }), // 29 dias antes: ainda no período
      day("2026-08-16", { workouts: 1 }), // 30 dias antes: período anterior
      day("2026-07-18", { workouts: 1 }), // 59 dias antes: período anterior
      day("2026-07-17", { workouts: 5 }), // 60 dias antes: fora dos dois
    ];

    const { workouts } = summarizeProgress(days, TODAY);

    expect(workouts.value).toBe(3);
    expect(workouts.delta).toBe(1);
  });
});

describe("summarizeProgress — aderência", () => {
  it("é o percentual de refeições feitas sobre as planejadas, com o delta em pontos", () => {
    const days = [
      day("2026-09-15", { plannedMeals: 5, doneMeals: 4 }),
      day("2026-09-14", { plannedMeals: 5, doneMeals: 5 }), // 90% no período
      day("2026-08-10", { plannedMeals: 5, doneMeals: 3 }), // 60% no anterior
    ];

    const { adherence } = summarizeProgress(days, TODAY);

    expect(adherence.value).toBe(90);
    expect(adherence.delta).toBe(30);
  });

  // Sem plano não é 0% de aderência: é não haver o que aderir.
  it("é nula sem refeição planejada, e o delta também", () => {
    const { adherence } = summarizeProgress([day("2026-09-15", { loggedMeals: 2 })], TODAY);

    expect(adherence.value).toBeNull();
    expect(adherence.delta).toBeNull();
  });
});

describe("summarizeProgress — dias top", () => {
  it("conta o dia com sessão concluída e todas as refeições planejadas feitas", () => {
    const days = [
      day("2026-09-15", { workouts: 1, plannedMeals: 4, doneMeals: 4 }),
      day("2026-09-14", { workouts: 1, plannedMeals: 4, doneMeals: 3 }),
      // Sem plano no dia: treinar sozinho não faz dia top.
      day("2026-09-13", { workouts: 1 }),
    ];

    expect(summarizeProgress(days, TODAY).topDays.value).toBe(1);
  });
});

describe("summarizeProgress — série de 8 semanas", () => {
  it("tem oito semanas de sete dias terminando hoje, da mais antiga à atual", () => {
    const days = [
      day("2026-09-15", { workouts: 2 }), // semana atual: 09/09 a 15/09
      day("2026-09-08", { workouts: 1 }), // semana anterior
      day("2026-07-22", { workouts: 3 }), // a oitava semana: 22/07 a 28/07
      day("2026-07-21", { workouts: 9 }), // fora da série
    ];

    expect(summarizeProgress(days, TODAY).workouts.spark).toEqual([3, 0, 0, 0, 0, 0, 1, 2]);
  });

  it("marca como nula a semana sem refeição planejada", () => {
    const days = [day("2026-09-15", { plannedMeals: 2, doneMeals: 1 })];

    const { spark } = summarizeProgress(days, TODAY).adherence;

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

  it("gradua o dia: nada, refeição registrada, treino ou plano cumprido, os dois", () => {
    const days = [
      day("2026-09-13", { workouts: 1, plannedMeals: 3, doneMeals: 3 }),
      day("2026-09-14", { plannedMeals: 3, doneMeals: 1, loggedMeals: 1 }),
      day("2026-09-15", { workouts: 1, plannedMeals: 3, doneMeals: 1 }),
    ];

    const weeks = consistencyWeeks(days, TODAY);

    expect(weeks[11][5].level).toBe(0); // sábado sem registro
    expect(weeks[11][6].level).toBe(3); // domingo, dia top
    expect(weeks[12][0].level).toBe(1);
    expect(weeks[12][1].level).toBe(2);
  });
});

describe("activityStreak", () => {
  it("conta os dias seguidos com treino ou refeição registrada até hoje", () => {
    const days = [
      day("2026-09-12", { workouts: 1 }),
      day("2026-09-13"),
      day("2026-09-14", { loggedMeals: 1 }),
      day("2026-09-15", { workouts: 1 }),
    ];

    expect(activityStreak(days, TODAY).current).toBe(2);
  });

  // O dia ainda não acabou: acordar sem ter treinado não zera a sequência de ontem.
  it("hoje sem nada ainda, a sequência vale até ontem", () => {
    const days = [
      day("2026-09-13", { workouts: 1 }),
      day("2026-09-14", { workouts: 1 }),
      day(TODAY),
    ];

    expect(activityStreak(days, TODAY).current).toBe(2);
  });

  it("ontem e hoje sem nada, a sequência é zero", () => {
    const days = [day("2026-09-13", { workouts: 1 }), day("2026-09-14"), day(TODAY)];

    expect(activityStreak(days, TODAY).current).toBe(0);
  });

  it("o recorde é a maior sequência do histórico, e diz quanto falta para empatar", () => {
    const days = [
      day("2026-09-01", { workouts: 1 }),
      day("2026-09-02", { workouts: 1 }),
      day("2026-09-03", { loggedMeals: 1 }),
      day("2026-09-04"),
      day("2026-09-14", { workouts: 1 }),
      day("2026-09-15", { workouts: 1 }),
    ];

    expect(activityStreak(days, TODAY)).toEqual({ current: 2, best: 3, toTie: 1 });
  });

  it("sem atividade nenhuma, tudo é zero", () => {
    expect(activityStreak([], TODAY)).toEqual({ current: 0, best: 0, toTie: 0 });
  });
});
