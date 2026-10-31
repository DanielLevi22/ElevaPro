import type { SetPrescription } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import { applyRestToAll, toggleId, toggleSegmentMethod } from "../setPlanEditing";

const set = (methods: string[], rest_seconds: number | null = 60): SetPrescription => ({
  methods,
  reps: { mode: "count", value: 10 },
  weight_kg: null,
  rest_seconds,
  target_rir: null,
  segments: [],
});

describe("aplicar o descanso a todas as séries", () => {
  it("iguala o descanso e não mexe nas técnicas", () => {
    const plano = [
      set(["warmup"], 30),
      set(["rest_pause", "isometric"], 90),
      set(["working"], null),
    ];
    const igualado = applyRestToAll(plano, 120);
    expect(igualado.map((s) => s.rest_seconds)).toEqual([120, 120, 120]);
    expect(igualado.map((s) => s.methods)).toEqual(plano.map((s) => s.methods));
  });
});

describe("marcar e desmarcar técnica", () => {
  it("marca no fim e desmarca sem mexer na ordem das outras", () => {
    expect(toggleId(["rest_pause"], "isometric")).toEqual(["rest_pause", "isometric"]);
    expect(toggleId(["warmup", "tempo", "partial"], "tempo")).toEqual(["warmup", "partial"]);
  });

  it("no bloco, só o bloco muda", () => {
    const bloco = {
      reps: { mode: "failure" as const },
      weight_kg: 60,
      pause_seconds: 0,
      methods: [],
    };
    expect(toggleSegmentMethod(bloco, "partial")).toEqual({ ...bloco, methods: ["partial"] });
  });
});
