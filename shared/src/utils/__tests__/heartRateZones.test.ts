import { describe, expect, it } from "vitest";
import { distributeIntoZones, estimateMaxHeartRate, summarizeHeartRate } from "../heartRateZones";

describe("estimateMaxHeartRate", () => {
  it("é 220 menos a idade declarada, quando declarada hoje", () => {
    const today = new Date("2026-09-14T12:00:00Z");
    expect(estimateMaxHeartRate(30, today, today)).toBe(190);
  });

  // A anamnese é respondida uma vez. Sem somar o tempo passado, quem declarou 30
  // anos há três anos teria para sempre a FC máxima de quem tem 30.
  it("soma os anos completos desde a declaração", () => {
    const declaredAt = new Date("2023-09-10T12:00:00Z");
    expect(estimateMaxHeartRate(30, declaredAt, new Date("2026-09-14T12:00:00Z"))).toBe(187);
  });

  it("não soma o ano cujo aniversário da declaração ainda não chegou", () => {
    const declaredAt = new Date("2023-09-20T12:00:00Z");
    expect(estimateMaxHeartRate(30, declaredAt, new Date("2026-09-14T12:00:00Z"))).toBe(188);
  });

  it("idade implausível não vira FC máxima", () => {
    const today = new Date("2026-09-14T12:00:00Z");
    expect(estimateMaxHeartRate(0, today, today)).toBeNull();
    expect(estimateMaxHeartRate(130, today, today)).toBeNull();
    expect(estimateMaxHeartRate(Number.NaN, today, today)).toBeNull();
  });
});

describe("distributeIntoZones", () => {
  // FC máxima 200: Z1 < 120 · Z2 120–139 · Z3 140–159 · Z4 160–179 · Z5 ≥ 180.
  it("conta cada amostra na zona do percentual da FC máxima", () => {
    const zones = distributeIntoZones([100, 130, 150, 170, 190], 200);
    expect(zones).toEqual({ zone1: 20, zone2: 20, zone3: 20, zone4: 20, zone5: 20 });
  });

  it("o limite inferior de cada faixa já pertence à zona de cima", () => {
    const zones = distributeIntoZones([120, 140, 160, 180], 200);
    expect(zones).toEqual({ zone1: 0, zone2: 25, zone3: 25, zone4: 25, zone5: 25 });
  });

  it("abaixo de 50% conta na Z1 e acima de 100% na Z5, para a soma fechar", () => {
    const zones = distributeIntoZones([60, 230], 200);
    expect(zones).toEqual({ zone1: 50, zone2: 0, zone3: 0, zone4: 0, zone5: 50 });
  });

  // Percentual arredondado um a um pode somar 99 ou 101, e a tela mostraria uma
  // barra que não fecha. O resto vai para as zonas com a maior parte perdida.
  it("os percentuais sempre somam 100", () => {
    const zones = distributeIntoZones([100, 130, 150], 200);
    const sum = Object.values(zones ?? {}).reduce((total, pct) => total + pct, 0);
    expect(sum).toBe(100);
  });

  it("sem amostra não há distribuição", () => {
    expect(distributeIntoZones([], 200)).toBeNull();
  });

  it("FC máxima inválida não distribui", () => {
    expect(distributeIntoZones([150], 0)).toBeNull();
  });
});

describe("summarizeHeartRate", () => {
  it("devolve a média arredondada e as zonas das amostras", () => {
    expect(summarizeHeartRate([100, 130, 150, 170, 190], 200)).toEqual({
      avgHeartRate: 148,
      zones: { zone1: 20, zone2: 20, zone3: 20, zone4: 20, zone5: 20 },
    });
  });

  it("sem fc máxima, devolve só a média", () => {
    expect(summarizeHeartRate([150, 154], null)).toEqual({ avgHeartRate: 152, zones: null });
  });

  // Uma leitura 0 ou 250 é o sensor escorregando no pulso, não esforço. Se entrasse
  // nas zonas, um zero empurraria tempo para a Z1 que a média, filtrada, não viu.
  it("descarta a amostra implausível da média e das zonas", () => {
    expect(summarizeHeartRate([0, 150, 250, 150], 200)).toEqual({
      avgHeartRate: 150,
      zones: { zone1: 0, zone2: 0, zone3: 100, zone4: 0, zone5: 0 },
    });
  });

  it("sem amostra plausível, não há o que gravar", () => {
    expect(summarizeHeartRate([], 200)).toBeNull();
    expect(summarizeHeartRate([9, 11], 200)).toBeNull();
  });
});
