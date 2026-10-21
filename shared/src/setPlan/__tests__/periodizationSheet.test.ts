import { describe, expect, it } from "vitest";
import { buildPeriodizationSheet, type SetPrescription } from "..";

const serie: SetPrescription = {
  methods: ["working"],
  reps: { mode: "count", value: 10 },
  weight_kg: null,
  rest_seconds: 60,
  target_rir: null,
  segments: [],
};

const treino = (title: string, exercicio: string) => ({
  title,
  exercises: [
    {
      order_index: 0,
      notes: null,
      set_plan: [serie],
      exercise: { name: exercicio, muscle_group: null },
    },
  ],
});

describe("buildPeriodizationSheet — o plano completo na folha do PDF", () => {
  const plano = buildPeriodizationSheet({
    periodization: {
      name: "Hipertrofia 12 semanas",
      objective: "Ganho de massa",
      start_date: "2026-10-01",
      end_date: "2026-12-24",
    },
    phases: [
      {
        plan: {
          name: "Intensificação",
          order_index: 1,
          start_date: "2026-11-01",
          end_date: "2026-11-30",
        },
        workouts: [treino("Treino A", "Supino")],
      },
      {
        plan: {
          name: "Adaptação",
          order_index: 0,
          start_date: "2026-10-01",
          end_date: "2026-10-31",
        },
        workouts: [treino("Treino A", "Agachamento"), treino("Treino B", "Remada")],
      },
    ],
  });

  it("leva nome, objetivo e período da periodização", () => {
    expect(plano).toMatchObject({
      name: "Hipertrofia 12 semanas",
      objective: "Ganho de massa",
      startDate: "2026-10-01",
      endDate: "2026-12-24",
    });
  });

  it("põe as fases na ordem do plano, numeradas", () => {
    expect(plano.phases.map((f) => [f.order, f.name])).toEqual([
      [1, "Adaptação"],
      [2, "Intensificação"],
    ]);
    expect(plano.phases[0]).toMatchObject({ startDate: "2026-10-01", endDate: "2026-10-31" });
  });

  it("cada fase traz os seus treinos já como folha, série a série", () => {
    const [adaptacao] = plano.phases;
    expect(adaptacao?.workouts.map((t) => t.title)).toEqual(["Treino A", "Treino B"]);
    expect(adaptacao?.workouts[0]?.exercises[0]?.name).toBe("Agachamento");
    expect(adaptacao?.workouts[0]?.exercises[0]?.sets[0]?.reps).toBe("10 reps");
  });

  it("fase sem treino continua na folha, vazia", () => {
    const vazio = buildPeriodizationSheet({
      periodization: {
        name: "P",
        objective: null,
        start_date: "2026-10-01",
        end_date: "2026-10-31",
      },
      phases: [
        {
          plan: {
            name: "Fase 1",
            order_index: 0,
            start_date: "2026-10-01",
            end_date: "2026-10-31",
          },
          workouts: [],
        },
      ],
    });
    expect(vazio.phases[0]?.workouts).toEqual([]);
  });
});
