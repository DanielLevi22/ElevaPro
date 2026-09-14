import { describe, expect, it } from "vitest";
import {
  declaresContinuousMedication,
  distributeIntoZones,
  estimateMaxHeartRate,
} from "../heartRateZones";

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

describe("declaresContinuousMedication", () => {
  it("resposta vazia ou ausente não declara medicação", () => {
    expect(declaresContinuousMedication(undefined)).toBe(false);
    expect(declaresContinuousMedication("   ")).toBe(false);
  });

  it("as negativas comuns não declaram medicação", () => {
    for (const answer of ["Não", "nao", "NÃO uso", "nenhum", "Nenhuma", "nada", "-", "n/a"]) {
      expect(declaresContinuousMedication(answer)).toBe(false);
    }
  });

  it("qualquer outro texto declara medicação", () => {
    expect(declaresContinuousMedication("Losartana 50mg")).toBe(true);
    expect(declaresContinuousMedication("uso betabloqueador")).toBe(true);
  });

  it("lê a resposta embrulhada que o mobile grava", () => {
    expect(declaresContinuousMedication({ questionId: "medications", value: "Atenolol" })).toBe(
      true,
    );
  });
});
