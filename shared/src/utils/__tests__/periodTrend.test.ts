import { describe, expect, it } from "vitest";
import { trendOver, weeklyValues } from "../periodTrend";

const TODAY = "2026-09-15";
const count = (items: readonly { date: string }[]) => items.length;
const none = () => null;

describe("trendOver", () => {
  it("mede o período, o anterior de mesmo tamanho e a diferença entre os dois", () => {
    const items = [{ date: "2026-09-15" }, { date: "2026-09-10" }, { date: "2026-09-05" }];

    expect(trendOver(items, TODAY, 7, count)).toMatchObject({ value: 2, delta: 1 });
  });

  it("sem medida de um dos lados, a diferença é nula", () => {
    expect(trendOver([], TODAY, 7, none)).toMatchObject({ value: null, delta: null });
  });

  it("traz a série das últimas 8 semanas", () => {
    expect(trendOver([{ date: TODAY }], TODAY, 7, count).spark).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
  });
});

describe("weeklyValues", () => {
  it("mede semanas de sete dias terminando hoje, da mais antiga à atual", () => {
    const items = [{ date: "2026-09-15" }, { date: "2026-09-08" }, { date: "2026-09-09" }];

    expect(weeklyValues(items, TODAY, 2, count)).toEqual([1, 2]);
  });
});
