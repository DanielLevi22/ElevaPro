import { describe, expect, it } from "vitest";
import { applyQuickAdjust, quickAdjustOf, type SetPrescription } from "..";

const serie = (campos: Partial<SetPrescription>): SetPrescription => ({
  methods: ["working"],
  reps: { mode: "range", min: 8, max: 12 },
  weight_kg: 80,
  rest_seconds: 90,
  target_rir: null,
  segments: [],
  ...campos,
});
const aquecimento = serie({
  methods: ["warmup"],
  reps: { mode: "count", value: 15 },
  weight_kg: 40,
  rest_seconds: 30,
});

describe("quickAdjustOf — o lápis abre com a série de trabalho", () => {
  it("mostra o total de séries e os valores da primeira série que conta volume", () => {
    expect(quickAdjustOf([aquecimento, serie({}), serie({})])).toEqual({
      sets: 3,
      reps: "8-12",
      weight: "80",
      rest_seconds: 90,
    });
  });

  it("até a falha e tempo viram o texto que o campo aceita de volta", () => {
    expect(quickAdjustOf([serie({ reps: { mode: "failure" } })]).reps).toBe("falha");
    expect(quickAdjustOf([serie({ reps: { mode: "time", seconds: 30 } })]).reps).toBe("30s");
  });

  it("sem carga prescrita, o campo abre vazio", () => {
    expect(quickAdjustOf([serie({ weight_kg: null })]).weight).toBe("");
  });
});

describe("applyQuickAdjust — o lápis aplicado ao plano da sessão", () => {
  const plano = [aquecimento, serie({}), serie({})];

  it("reps, carga e descanso valem nas séries de trabalho; o aquecimento fica", () => {
    const ajustado = applyQuickAdjust(plano, {
      sets: 3,
      reps: "6",
      weight: "100",
      rest_seconds: 120,
    });
    expect(ajustado[0]).toEqual(aquecimento);
    expect(ajustado[1]).toMatchObject({
      reps: { mode: "count", value: 6 },
      weight_kg: 100,
      rest_seconds: 120,
    });
    expect(ajustado[2]).toMatchObject({
      reps: { mode: "count", value: 6 },
      weight_kg: 100,
      rest_seconds: 120,
    });
  });

  it("mais séries copiam a última; menos séries cortam do fim", () => {
    const rest = serie({
      methods: ["rest_pause"],
      segments: [{ reps: { mode: "count", value: 4 }, weight_kg: 80, pause_seconds: 15 }],
    });
    const maior = applyQuickAdjust([aquecimento, rest], {
      sets: 4,
      reps: "8-12",
      weight: "80",
      rest_seconds: 90,
    });
    expect(maior).toHaveLength(4);
    expect(maior[3]?.methods).toEqual(["rest_pause"]);
    expect(maior[3]?.segments).toHaveLength(1);

    const menor = applyQuickAdjust(plano, {
      sets: 1,
      reps: "8-12",
      weight: "80",
      rest_seconds: 90,
    });
    expect(menor).toEqual([aquecimento]);
  });

  it("carga em branco vira carga livre", () => {
    const ajustado = applyQuickAdjust(plano, { sets: 3, reps: "10", weight: "", rest_seconds: 60 });
    expect(ajustado[1]?.weight_kg).toBeNull();
  });

  it("não altera o plano de entrada", () => {
    const antes = structuredClone(plano);
    applyQuickAdjust(plano, { sets: 5, reps: "5", weight: "1", rest_seconds: 1 });
    expect(plano).toEqual(antes);
  });
});
