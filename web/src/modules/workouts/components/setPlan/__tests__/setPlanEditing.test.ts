import type { SetPrescription } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import { applyRestToAll, extraMethodsOf, primaryTypeOf, withPrimaryType } from "../setPlanEditing";

const set = (methods: string[], rest_seconds: number | null = 60): SetPrescription => ({
  methods,
  reps: { mode: "count", value: 10 },
  weight_kg: null,
  rest_seconds,
  target_rir: null,
  segments: [],
});

describe("o tipo da série e as técnicas extras", () => {
  it("o tipo é a técnica de estrutura; sem nenhuma, é Normal", () => {
    expect(primaryTypeOf(set(["rest_pause", "isometric"]))).toBe("rest_pause");
    expect(primaryTypeOf(set(["isometric"]))).toBe("working");
    expect(primaryTypeOf(set([]))).toBe("working");
  });

  it("trocar o tipo troca só a estrutura e mantém as extras", () => {
    const trocada = withPrimaryType(set(["warmup", "tempo", "bi_set"]), "drop_set");
    expect(trocada.methods).toEqual(["drop_set", "tempo", "bi_set"]);
  });

  it("as extras são as técnicas fora da estrutura da série", () => {
    expect(extraMethodsOf(set(["rest_pause", "isometric", "bi_set"]))).toEqual([
      "isometric",
      "bi_set",
    ]);
  });

  it("aplicar o descanso a todas iguala o descanso e não mexe no resto", () => {
    const plano = [set(["warmup"], 30), set(["working"], 90), set(["working"], null)];
    const igualado = applyRestToAll(plano, 120);
    expect(igualado.map((s) => s.rest_seconds)).toEqual([120, 120, 120]);
    expect(igualado.map((s) => s.methods)).toEqual(plano.map((s) => s.methods));
  });
});
