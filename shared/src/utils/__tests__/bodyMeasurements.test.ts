import { describe, expect, it } from "vitest";
import type { PhysicalAssessment } from "../../types/physicalAssessment.types";
import {
  baselineBefore,
  bodyComposition,
  circumferences,
  latestSource,
  measurementDifferences,
  seriesOf,
} from "../bodyMeasurements";

/** Uma avaliação com peso e altura; o que não é dito fica sem medida. */
function assessment(
  assessed_at: string,
  fields: Partial<PhysicalAssessment> = {},
): PhysicalAssessment {
  return {
    id: assessed_at,
    student_id: "aluno-1",
    specialist_id: null,
    measured_by: "self",
    assessed_at: `${assessed_at}T10:00:00Z`,
    weight_kg: 80,
    height_cm: 180,
    ...fields,
  } as PhysicalAssessment;
}

describe("seriesOf", () => {
  // Fita e declaração não se comparam: a diferença entre as duas é método, não corpo.
  it("devolve só os registros da origem pedida, do mais antigo ao mais recente", () => {
    const records = [
      assessment("2026-09-01"),
      assessment("2026-08-01", { measured_by: "specialist" }),
      assessment("2026-07-01"),
    ];

    expect(seriesOf(records, "self").map((item) => item.id)).toEqual(["2026-07-01", "2026-09-01"]);
  });
});

describe("latestSource", () => {
  it("é a origem do registro mais recente, e nula sem registro", () => {
    const records = [
      assessment("2026-09-01", { measured_by: "specialist" }),
      assessment("2026-08-01"),
    ];

    expect(latestSource(records)).toBe("specialist");
    expect(latestSource([])).toBeNull();
  });
});

describe("bodyComposition", () => {
  it("dá peso, gordura, massa magra do peso sem a gordura, e IMC com uma casa", () => {
    expect(bodyComposition(assessment("2026-09-01", { weight_kg: 80, body_fat_pct: 20 }))).toEqual({
      weight: 80,
      fatPercent: 20,
      leanMass: 64,
      bmi: 24.7,
    });
  });

  // Sem gordura não há massa magra: inventar uma seria afirmar composição que ninguém mediu.
  it("sem gordura, massa magra é nula", () => {
    expect(bodyComposition(assessment("2026-09-01")).leanMass).toBeNull();
  });

  it("lê o numeric que o PostgREST devolve como texto", () => {
    const record = assessment("2026-09-01", { weight_kg: "72.5" as unknown as number });

    expect(bodyComposition(record).weight).toBe(72.5);
  });
});

describe("circumferences", () => {
  it("dá as 8 medidas do kit, com a média dos lados preenchidos", () => {
    const record = assessment("2026-09-01", {
      circ_chest: 104,
      circ_right_arm: 38,
      circ_left_arm: 37,
      circ_right_thigh: 60,
    });

    const byKey = Object.fromEntries(circumferences(record).map((item) => [item.key, item.value]));

    expect(Object.keys(byKey)).toEqual([
      "chest",
      "waist",
      "hip",
      "arm",
      "thigh",
      "calf",
      "shoulder",
      "neck",
    ]);
    expect(byKey).toMatchObject({ chest: 104, arm: 37.5, thigh: 60, calf: null });
  });
});

describe("baselineBefore", () => {
  it("é o registro mais próximo de 90 dias antes do mais recente", () => {
    const records = [
      assessment("2026-09-15"),
      assessment("2026-06-10"), // 97 dias antes
      assessment("2026-06-20"), // 87 dias antes: o mais próximo de 90
      assessment("2026-03-01"),
    ];

    expect(baselineBefore(records)?.id).toBe("2026-06-20");
  });

  it("com um registro só, não há com o que comparar", () => {
    expect(baselineBefore([assessment("2026-09-15")])).toBeNull();
  });
});

describe("measurementDifferences", () => {
  it("dá a diferença de cada campo presente nos dois registros, com uma casa", () => {
    const before = assessment("2026-06-15", {
      weight_kg: 81.4,
      body_fat_pct: 18.3,
      circ_waist: 84.4,
    });
    const after = assessment("2026-09-15", { weight_kg: 80, body_fat_pct: 17.2, circ_waist: 81.6 });

    const diffs = measurementDifferences(before, after);

    expect(diffs.find((item) => item.key === "weight")).toEqual({
      key: "weight",
      label: "Peso",
      unit: "kg",
      delta: -1.4,
    });
    expect(diffs.find((item) => item.key === "waist")?.delta).toBe(-2.8);
    // Peito sem medida em nenhum dos dois: sem linha, e não zero.
    expect(diffs.some((item) => item.key === "chest")).toBe(false);
  });
});
