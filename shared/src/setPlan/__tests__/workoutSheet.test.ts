import { describe, expect, it } from "vitest";
import { buildWorkoutSheet, describeRepsTarget, describeSegment, type SetPrescription } from "..";

const serie = (campos: Partial<SetPrescription>): SetPrescription => ({
  methods: ["working"],
  reps: { mode: "range", min: 8, max: 12 },
  weight_kg: 80,
  rest_seconds: 90,
  target_rir: null,
  segments: [],
  ...campos,
});

const item = (
  name: string,
  order_index: number,
  set_plan: SetPrescription[],
  notes: string | null = null,
) => ({
  order_index,
  notes,
  set_plan,
  exercise: { name, muscle_group: "Pernas" },
});

describe("describeRepsTarget — a meta de repetições em texto", () => {
  it.each([
    [{ mode: "count", value: 12 } as const, "12 reps"],
    [{ mode: "range", min: 8, max: 12 } as const, "8–12 reps"],
    [{ mode: "failure" } as const, "até a falha"],
    [{ mode: "time", seconds: 45 } as const, "45 s"],
    [{ mode: "time", seconds: 600 } as const, "10 min"],
  ])("%o vira %s", (reps, texto) => {
    expect(describeRepsTarget(reps)).toBe(texto);
  });
});

describe("buildWorkoutSheet — o treino na folha do PDF", () => {
  it("põe os exercícios na ordem da prescrição", () => {
    const sheet = buildWorkoutSheet({
      title: "Treino A",
      exercises: [item("Leg press", 1, [serie({})]), item("Agachamento", 0, [serie({})])],
    });
    expect(sheet.exercises.map((e) => e.name)).toEqual(["Agachamento", "Leg press"]);
    expect(sheet.exercises.map((e) => e.order)).toEqual([1, 2]);
  });

  it("escreve cada série com técnicas, reps, carga, descanso, RIR e blocos", () => {
    const sheet = buildWorkoutSheet({
      title: "Treino A",
      exercises: [
        item(
          "Agachamento",
          0,
          [
            serie({
              methods: ["warmup"],
              reps: { mode: "count", value: 15 },
              weight_kg: 40,
              rest_seconds: 30,
            }),
            serie({
              methods: ["rest_pause", "working"],
              reps: { mode: "failure" },
              target_rir: 0,
              segments: [
                {
                  reps: { mode: "count", value: 4 },
                  weight_kg: 80,
                  pause_seconds: 15,
                  methods: [],
                },
              ],
            }),
          ],
          "Joelho alinhado",
        ),
      ],
    });

    expect(sheet.exercises[0]).toEqual({
      order: 1,
      name: "Agachamento",
      muscleGroup: "Pernas",
      notes: "Joelho alinhado",
      sets: [
        {
          label: "Série 1",
          methods: ["Aquecimento"],
          reps: "15 reps",
          weight: "40 kg",
          rest: "30 s",
          rir: null,
          segments: [],
        },
        {
          label: "Série 2",
          methods: ["Rest-pause"],
          reps: "até a falha",
          weight: "80 kg",
          rest: "90 s",
          rir: "RIR 0",
          segments: ["Pausa 15 s → 4 reps · 80 kg"],
        },
      ],
    });
  });

  it("sem carga e sem descanso, não inventa valor", () => {
    const sheet = buildWorkoutSheet({
      title: "Treino A",
      exercises: [
        item("Prancha", 0, [
          serie({ reps: { mode: "time", seconds: 60 }, weight_kg: null, rest_seconds: null }),
        ]),
      ],
    });
    expect(sheet.exercises[0]?.sets[0]).toMatchObject({ reps: "1 min", weight: null, rest: null });
  });

  it("carga com casa decimal usa vírgula, como a tela", () => {
    const sheet = buildWorkoutSheet({
      title: "Treino A",
      exercises: [item("Rosca", 0, [serie({ weight_kg: 12.5 })])],
    });
    expect(sheet.exercises[0]?.sets[0]?.weight).toBe("12,5 kg");
  });

  it("o bloco leva as técnicas dele no roteiro", () => {
    expect(
      describeSegment({
        reps: { mode: "failure" },
        weight_kg: 60,
        pause_seconds: 0,
        methods: ["partial", "negative"],
      }),
    ).toBe("→ até a falha · 60 kg · Parcial, Negativa");
  });
});
