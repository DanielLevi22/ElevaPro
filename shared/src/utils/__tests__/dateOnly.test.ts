import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  shortMonthOf,
  weekdayFromMonday,
  weekdayOf,
  withinDays,
} from "../dateOnly";

describe("dateOnly", () => {
  // Em fuso negativo, `new Date("2026-09-01")` vira 31/08 ao ler a data local.
  it("soma dias atravessando o mês sem passar pelo fuso", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(daysBetween("2026-09-01", "2026-09-15")).toBe(14);
  });

  it("dá o dia da semana com domingo = 0, e com segunda = 0", () => {
    expect(weekdayOf("2026-09-13")).toBe(0); // domingo
    expect(weekdayFromMonday("2026-09-13")).toBe(6);
  });

  it("dá o mês curto como o kit escreve no eixo", () => {
    expect(shortMonthOf("2026-09-15")).toBe("set");
  });

  it("recorta os itens dos últimos N dias, hoje incluso", () => {
    const items = [{ date: "2026-09-15" }, { date: "2026-09-13" }, { date: "2026-09-12" }];

    expect(withinDays(items, "2026-09-15", 3).map((item) => item.date)).toEqual([
      "2026-09-15",
      "2026-09-13",
    ]);
  });
});
