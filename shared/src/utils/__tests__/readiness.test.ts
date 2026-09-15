import { describe, expect, it } from "vitest";
import {
  computeReadiness,
  describeReadiness,
  READINESS_VERSION,
  type ReadinessReading,
} from "../readiness";

/** Três dias de base iguais: sono de 420 min e FC de repouso de 60. */
const BASELINE: ReadinessReading[] = [
  { sleepMinutes: 420, restingHeartRate: 60 },
  { sleepMinutes: 420, restingHeartRate: 60 },
  { sleepMinutes: 420, restingHeartRate: 60 },
];

describe("computeReadiness", () => {
  it("um dia igual à média dá 70, na faixa moderada, com a versão da regra", () => {
    expect(computeReadiness({ sleepMinutes: 420, restingHeartRate: 60 }, BASELINE)).toEqual({
      score: 70,
      band: "moderate",
      version: READINESS_VERSION,
      sleepTrend: "steady",
      heartRateTrend: "steady",
    });
  });

  it("sono 20% acima e FC 8% abaixo da média dão 100", () => {
    const readiness = computeReadiness({ sleepMinutes: 504, restingHeartRate: 55.2 }, BASELINE);
    expect(readiness?.score).toBe(100);
    expect(readiness?.band).toBe("good");
  });

  // Uma noite de 12 horas depois de uma viagem não é prontidão máxima, e um sensor
  // que escorrega no pulso não pode derrubar a nota para zero.
  it("para nos limites: além de ±20% de sono e ±8% de FC nada muda", () => {
    const extreme = computeReadiness({ sleepMinutes: 900, restingHeartRate: 20 }, BASELINE);
    const limit = computeReadiness({ sleepMinutes: 504, restingHeartRate: 55.2 }, BASELINE);
    expect(extreme?.score).toBe(limit?.score);

    const worst = computeReadiness({ sleepMinutes: 60, restingHeartRate: 120 }, BASELINE);
    expect(worst?.score).toBe(40);
    expect(worst?.band).toBe("low");
  });

  it("FC de repouso mais baixa que a média sobe a nota; mais alta, desce", () => {
    const lower = computeReadiness({ sleepMinutes: 420, restingHeartRate: 57 }, BASELINE);
    const higher = computeReadiness({ sleepMinutes: 420, restingHeartRate: 63 }, BASELINE);
    expect(lower?.score).toBeGreaterThan(70);
    expect(higher?.score).toBeLessThan(70);
  });

  it("75 já é boa, 55 ainda é moderada e 54 já é baixa", () => {
    // 5 pontos de sono = 1/3 de 20% = 6,67% acima da média.
    const good = computeReadiness({ sleepMinutes: 448, restingHeartRate: 60 }, BASELINE);
    expect(good?.score).toBe(75);
    expect(good?.band).toBe("good");

    // Sono 20% abaixo tira 15: sobra 55.
    const moderate = computeReadiness({ sleepMinutes: 336, restingHeartRate: 60 }, BASELINE);
    expect(moderate?.score).toBe(55);
    expect(moderate?.band).toBe("moderate");

    // Mais 0,67% de FC tira 1,25: 53,75 arredonda para 54.
    const low = computeReadiness({ sleepMinutes: 336, restingHeartRate: 60.4 }, BASELINE);
    expect(low?.score).toBe(54);
    expect(low?.band).toBe("low");
  });

  // Média de dois dias tem cara de medição e não é uma: a nota não é inventada.
  it("sem nota com menos de 3 dias de base de cada medida", () => {
    const shortSleep = [
      { sleepMinutes: 420, restingHeartRate: 60 },
      { sleepMinutes: null, restingHeartRate: 60 },
      { sleepMinutes: 420, restingHeartRate: 60 },
    ];
    expect(computeReadiness({ sleepMinutes: 420, restingHeartRate: 60 }, shortSleep)).toBeNull();
  });

  it("sem nota sem a leitura de hoje de qualquer uma das duas", () => {
    expect(computeReadiness({ sleepMinutes: null, restingHeartRate: 60 }, BASELINE)).toBeNull();
    expect(computeReadiness({ sleepMinutes: 420, restingHeartRate: null }, BASELINE)).toBeNull();
  });

  it("usa só os 14 dias mais recentes da base", () => {
    const old = Array.from({ length: 20 }, () => ({ sleepMinutes: 300, restingHeartRate: 80 }));
    const recent = Array.from({ length: 14 }, () => ({ sleepMinutes: 420, restingHeartRate: 60 }));
    const readiness = computeReadiness({ sleepMinutes: 420, restingHeartRate: 60 }, [
      ...recent,
      ...old,
    ]);
    expect(readiness?.score).toBe(70);
  });
});

describe("describeReadiness", () => {
  it("descreve a comparação sem dizer o que ela significa para a saúde", () => {
    const readiness = computeReadiness({ sleepMinutes: 470, restingHeartRate: 60 }, BASELINE);
    if (!readiness) throw new Error("a regra deveria ter dado nota com base de 3 dias");
    expect(describeReadiness(readiness)).toBe("Sono acima da sua média e FC de repouso estável.");
  });

  it("nomeia a FC mais alta e o sono abaixo", () => {
    const readiness = computeReadiness({ sleepMinutes: 360, restingHeartRate: 65 }, BASELINE);
    if (!readiness) throw new Error("a regra deveria ter dado nota com base de 3 dias");
    expect(describeReadiness(readiness)).toBe(
      "Sono abaixo da sua média e FC de repouso acima dela.",
    );
  });
});
