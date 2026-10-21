import { describe, expect, it } from "vitest";
import { type SetPrescription, workingSetCount } from "..";

const set = (methods: string[]): SetPrescription => ({
  methods,
  reps: { mode: "count", value: 10 },
  weight_kg: null,
  rest_seconds: 60,
  target_rir: null,
  segments: [],
});

describe("workingSetCount — séries que contam no volume", () => {
  it("deixa aquecimento e preparação de fora", () => {
    const plan = [set(["warmup"]), set(["feeder"]), set(["working"]), set(["rest_pause"])];
    expect(workingSetCount(plan)).toBe(2);
  });

  // Marcar "Aquecimento" junto de outra técnica continua sendo aquecimento.
  it("série de aquecimento com outra técnica continua fora", () => {
    expect(workingSetCount([set(["warmup", "tempo"])])).toBe(0);
  });

  it("série sem técnica marcada conta como trabalho", () => {
    expect(workingSetCount([set([])])).toBe(1);
  });
});
