import { describe, expect, it } from "vitest";
import { type CompletedSet, exerciseProgress, summarizeTrainingLoad } from "../trainingProgress";

const TODAY = "2026-09-15";

/** Uma série feita; o que não é dito é agachamento de pernas, 10 × 50 kg. */
function set(date: string, fields: Partial<CompletedSet> = {}): CompletedSet {
  return {
    date,
    sessionId: `sessao-${date}`,
    exerciseId: "agachamento",
    exerciseName: "Agachamento livre",
    muscleGroup: "Pernas",
    reps: 10,
    weight: 50,
    ...fields,
  };
}

describe("summarizeTrainingLoad — carga total", () => {
  it("soma carga × repetições do período e compara, em %, com o período anterior de mesmo tamanho", () => {
    const sets = [
      set("2026-09-15"), // 500 kg
      set("2026-08-19"), // 27 dias antes: ainda nas 4 semanas
      set("2026-08-18", { weight: 40 }), // 28 dias antes: período anterior, 400 kg
      set("2026-07-21", { weight: 40 }), // 56 dias antes: fora dos dois
    ];

    const load = summarizeTrainingLoad(sets, TODAY, 4);

    expect(load.total).toBe(1000);
    expect(load.deltaPercent).toBe(150);
  });

  it("tem uma semana por ponto, terminando hoje", () => {
    const sets = [set("2026-09-15"), set("2026-09-09"), set("2026-09-08", { weight: 20 })];

    const { weekly } = summarizeTrainingLoad(sets, TODAY, 4);

    expect(weekly).toEqual([
      { weekStart: "2026-08-19", kilograms: 0 },
      { weekStart: "2026-08-26", kilograms: 0 },
      { weekStart: "2026-09-02", kilograms: 200 },
      { weekStart: "2026-09-09", kilograms: 1000 },
    ]);
  });

  // Peso do corpo não é zero quilo levantado: a série existe e não soma volume.
  it("série sem carga ou sem repetição não soma volume", () => {
    const sets = [set("2026-09-15", { weight: null }), set("2026-09-15", { reps: null })];

    expect(summarizeTrainingLoad(sets, TODAY, 4).total).toBe(0);
  });

  it("sem carga no período anterior, o delta é nulo e não infinito", () => {
    expect(summarizeTrainingLoad([set("2026-09-15")], TODAY, 4).deltaPercent).toBeNull();
  });
});

describe("summarizeTrainingLoad — volume por grupo muscular", () => {
  it("dá o volume de cada grupo no período e no anterior, do maior para o menor", () => {
    const sets = [
      set("2026-09-15", { muscleGroup: "Costas", weight: 80 }), // 800
      set("2026-09-14"), // Pernas 500
      set("2026-08-10", { muscleGroup: "Costas", weight: 60 }), // anterior 600
    ];

    const { byMuscle } = summarizeTrainingLoad(sets, TODAY, 4);

    expect(byMuscle).toEqual([
      { muscle: "Costas", current: 800, previous: 600 },
      { muscle: "Pernas", current: 500, previous: 0 },
    ]);
  });

  it("mostra só os cinco maiores, e exercício sem grupo vai para Outros", () => {
    const groups = ["A", "B", "C", "D", "E", null];
    const sets = groups.map((muscleGroup, index) =>
      set("2026-09-15", { muscleGroup, weight: 10 * (index + 1) }),
    );

    const { byMuscle } = summarizeTrainingLoad(sets, TODAY, 4);

    expect(byMuscle.map((item) => item.muscle)).toEqual(["Outros", "E", "D", "C", "B"]);
  });
});

describe("summarizeTrainingLoad — grupo sem volume", () => {
  // A esteira entra na sessão com grupo "cardio" e sem carga: não é um grupo com zero
  // tonelada, é um grupo que esta conta não mede.
  it("grupo sem volume no período não aparece", () => {
    const sets = [
      set("2026-09-15", { muscleGroup: "cardio", reps: null, weight: null }),
      set("2026-09-15"),
    ];

    const { byMuscle } = summarizeTrainingLoad(sets, TODAY, 4);

    expect(byMuscle.map((item) => item.muscle)).toEqual(["Pernas"]);
  });
});

describe("summarizeTrainingLoad — estímulo", () => {
  it("conta as séries do período por faixa: até 6 força, 7 a 12 hipertrofia, 13 ou mais resistência", () => {
    const sets = [6, 7, 12, 13, 20].map((reps) => set("2026-09-15", { reps }));

    const { stimulus } = summarizeTrainingLoad(sets, TODAY, 4);

    expect(stimulus).toEqual([
      { kind: "hypertrophy", sets: 2 },
      { kind: "endurance", sets: 2 },
      { kind: "strength", sets: 1 },
    ]);
  });

  // Estímulo é faixa de repetição: série de carga sem repetição não tem faixa.
  it("série sem repetição não entra em faixa nenhuma, e faixa vazia some", () => {
    const sets = [set("2026-09-15", { reps: null }), set("2026-09-15", { reps: 8 })];

    expect(summarizeTrainingLoad(sets, TODAY, 4).stimulus).toEqual([
      { kind: "hypertrophy", sets: 1 },
    ]);
  });
});

describe("exerciseProgress", () => {
  it("dá a máxima de cada sessão do período, da mais antiga à mais recente", () => {
    const sets = [
      set("2026-09-15", { weight: 95 }),
      set("2026-09-15", { weight: 90 }),
      set("2026-09-01", { weight: 84 }),
      set("2026-06-01", { weight: 70 }), // antes das 12 semanas
    ];

    const [squat] = exerciseProgress(sets, TODAY, 12);

    expect(squat.series).toEqual([
      { date: "2026-09-01", max: 84 },
      { date: "2026-09-15", max: 95 },
    ]);
    expect(squat.currentMax).toBe(95);
    expect(squat.sessions).toBe(2);
  });

  it("a variação é da primeira à última máxima do período", () => {
    const sets = [set("2026-09-15", { weight: 90 }), set("2026-08-01", { weight: 80 })];

    expect(exerciseProgress(sets, TODAY, 12)[0].deltaPercent).toBe(12.5);
  });

  it("com uma sessão só, não há variação", () => {
    expect(exerciseProgress([set("2026-09-15")], TODAY, 12)[0].deltaPercent).toBeNull();
  });

  it("a melhor série é a mais pesada, e no empate a de mais repetições", () => {
    const sets = [
      set("2026-09-15", { weight: 95, reps: 3 }),
      set("2026-09-14", { weight: 95, reps: 5, sessionId: "outra" }),
      set("2026-09-14", { weight: 90, reps: 8, sessionId: "outra" }),
    ];

    const [squat] = exerciseProgress(sets, TODAY, 12);

    expect(squat.bestSet).toEqual({ weight: 95, reps: 5 });
    expect(squat.volume).toBe(95 * 3 + 95 * 5 + 90 * 8);
  });

  // Exercício só de peso do corpo não tem curva de carga para mostrar.
  it("fica de fora o exercício sem nenhuma série com carga no período", () => {
    const sets = [set("2026-09-15", { exerciseId: "prancha", weight: null }), set("2026-09-15")];

    expect(exerciseProgress(sets, TODAY, 12).map((item) => item.exerciseId)).toEqual([
      "agachamento",
    ]);
  });

  it("ordena do exercício treinado mais recentemente para o mais antigo", () => {
    const sets = [
      set("2026-09-01", { exerciseId: "supino", exerciseName: "Supino reto" }),
      set("2026-09-10"),
    ];

    expect(exerciseProgress(sets, TODAY, 12).map((item) => item.exerciseId)).toEqual([
      "agachamento",
      "supino",
    ]);
  });
});
