import { describe, expect, it } from "vitest";
import { validateSetPlan } from "..";

const normalSet = {
  methods: ["working"],
  reps: { mode: "count", value: 12 },
  weight_kg: 20,
  rest_seconds: 60,
  target_rir: null,
  segments: [],
};

describe("validateSetPlan — o formato do plano de séries", () => {
  it("aceita uma série rest-pause com segmentos", () => {
    const restPause = {
      ...normalSet,
      methods: ["rest_pause", "isometric"],
      target_rir: 0,
      segments: [
        { reps: { mode: "failure" }, weight_kg: 80, pause_seconds: 0, methods: [] },
        { reps: { mode: "count", value: 4 }, weight_kg: 80, pause_seconds: 15, methods: [] },
      ],
    };
    expect(validateSetPlan([normalSet, restPause])).toEqual([normalSet, restPause]);
  });

  it("recusa técnica fora do catálogo dizendo qual era", () => {
    expect(() => validateSetPlan([{ ...normalSet, methods: ["bfr"] }])).toThrow(/bfr/);
  });

  // LGPD Art. 6°, III (necessidade). A coluna é JSONB: se o schema aceitasse
  // campo desconhecido calado, qualquer dado — a pressão do manguito da BFR,
  // uma dor relatada — entraria na prescrição sem passar pelo /lgpd-check.
  it("o plano de séries não aceita campo fora do formato", () => {
    const withHealthData = { ...normalSet, cuff_pressure_mmhg: 180 };
    expect(
      () => validateSetPlan([withHealthData]),
      "DADO NÃO REVISADO NA PRESCRIÇÃO: o plano aceitou um campo fora do formato",
    ).toThrow(/cuff_pressure_mmhg/);
  });

  it("o segmento também não aceita campo fora do formato", () => {
    const segment = { reps: { mode: "failure" }, weight_kg: null, pause_seconds: 0, pain: 7 };
    expect(() => validateSetPlan([{ ...normalSet, segments: [segment] }])).toThrow(/pain/);
  });

  it("recusa mais de 20 séries dizendo quantas vieram", () => {
    expect(() => validateSetPlan(Array(21).fill(normalSet))).toThrow(/21 séries.*20/);
  });

  it("recusa mais de 10 segmentos dizendo quantos vieram", () => {
    const segment = { reps: { mode: "count", value: 5 }, weight_kg: null, pause_seconds: 10 };
    const set = { ...normalSet, segments: Array(11).fill(segment) };
    expect(() => validateSetPlan([set])).toThrow(/11 segmentos.*10/);
  });

  it.each([-1, 6, 2.5])("recusa o RIR alvo %d dizendo a faixa aceita", (rir) => {
    expect(() => validateSetPlan([{ ...normalSet, target_rir: rir }])).toThrow(
      new RegExp(`RIR alvo ${rir} fora da faixa`),
    );
  });

  it("o bloco aceita técnicas próprias do catálogo", () => {
    const segment = {
      reps: { mode: "count", value: 4 },
      weight_kg: 60,
      pause_seconds: 0,
      methods: ["partial"],
    };
    expect(
      validateSetPlan([{ ...normalSet, segments: [segment] }])[0]?.segments[0]?.methods,
    ).toEqual(["partial"]);
  });

  it("bloco gravado antes das técnicas por bloco é lido com a lista vazia", () => {
    const antigo = { reps: { mode: "count", value: 4 }, weight_kg: null, pause_seconds: 15 };
    expect(
      validateSetPlan([{ ...normalSet, segments: [antigo] }])[0]?.segments[0]?.methods,
    ).toEqual([]);
  });

  it("recusa técnica fora do catálogo no bloco, dizendo qual era", () => {
    const segment = {
      reps: { mode: "failure" },
      weight_kg: null,
      pause_seconds: 0,
      methods: ["bfr"],
    };
    expect(() => validateSetPlan([{ ...normalSet, segments: [segment] }])).toThrow(/bfr/);
  });
});
