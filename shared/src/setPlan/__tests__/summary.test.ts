import { describe, expect, it } from "vitest";
import { type RepsTarget, type SetPrescription, summarizeSetPlan } from "..";

const set = (
  reps: RepsTarget,
  weight_kg: number | null,
  methods: string[] = ["working"],
): SetPrescription => ({
  methods,
  reps,
  weight_kg,
  rest_seconds: 60,
  target_rir: null,
  segments: [],
});

describe("summarizeSetPlan — o resumo do exercício na lista", () => {
  it("junta contagem, faixa de reps, faixa de carga e técnicas", () => {
    const summary = summarizeSetPlan([
      set({ mode: "count", value: 15 }, 60, ["warmup"]),
      set({ mode: "range", min: 10, max: 12 }, 100),
      set({ mode: "count", value: 10 }, 140, ["rest_pause"]),
    ]);

    expect(summary).toEqual({
      sets: "3 séries",
      reps: "10–15 reps",
      weight: "60–140 kg",
      methods: ["Aquecimento", "Rest-pause"],
    });
  });

  it("série única e valores iguais não viram faixa", () => {
    expect(summarizeSetPlan([set({ mode: "count", value: 12 }, 20)])).toEqual({
      sets: "1 série",
      reps: "12 reps",
      weight: "20 kg",
      methods: [],
    });
  });

  // "Normal" é o padrão: repetir a etiqueta em todo exercício só faz ruído.
  it("não lista a técnica Normal nem repete técnica", () => {
    const plan = [
      set({ mode: "count", value: 8 }, null, ["drop_set"]),
      set({ mode: "count", value: 8 }, null, ["drop_set", "working"]),
    ];
    expect(summarizeSetPlan(plan).methods).toEqual(["Drop-set"]);
  });

  it("sem carga prescrita, não inventa peso", () => {
    expect(summarizeSetPlan([set({ mode: "count", value: 12 }, null)]).weight).toBeNull();
  });

  it("até a falha e tempo aparecem pelo nome, sem número", () => {
    expect(summarizeSetPlan([set({ mode: "failure" }, null)]).reps).toBe("até a falha");
    expect(summarizeSetPlan([set({ mode: "time", seconds: 30 }, null)]).reps).toBe("30 s");
  });

  it("modos misturados mostram a faixa numérica e o resto pelo nome", () => {
    const plan = [set({ mode: "count", value: 10 }, null), set({ mode: "failure" }, null)];
    expect(summarizeSetPlan(plan).reps).toBe("10 reps · até a falha");
  });

  it("plano vazio diz que não há séries", () => {
    expect(summarizeSetPlan([])).toEqual({
      sets: "0 séries",
      reps: null,
      weight: null,
      methods: [],
    });
  });

  it("lista também as técnicas dos blocos", () => {
    const comBloco = {
      ...set({ mode: "failure" }, 80, ["drop_set"]),
      segments: [
        {
          reps: { mode: "failure" as const },
          weight_kg: 60,
          pause_seconds: 0,
          methods: ["partial"],
        },
      ],
    };
    expect(summarizeSetPlan([comBloco]).methods).toEqual(["Drop-set", "Parcial"]);
  });
});
