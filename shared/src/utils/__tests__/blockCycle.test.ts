import { describe, expect, it } from "vitest";
import { blockWeek, deloadSets } from "../blockCycle";

const BLOCK = { start_date: "2026-10-01", end_date: "2026-10-29" };

describe("o ciclo do bloco", () => {
  it("as três primeiras semanas são normais, e a quarta é de descarga", () => {
    expect(blockWeek(BLOCK, "2026-10-01")).toEqual({
      week: 1,
      total: 4,
      deload: false,
      ended: false,
    });
    expect(blockWeek(BLOCK, "2026-10-21").deload).toBe(false);
    expect(blockWeek(BLOCK, "2026-10-22")).toMatchObject({ week: 4, deload: true });
  });

  it("no último dia o bloco acabou: hora da reavaliação, sem descarga", () => {
    expect(blockWeek(BLOCK, "2026-10-29")).toMatchObject({ week: 4, ended: true, deload: false });
  });

  it("bloco de duas semanas não tem descarga", () => {
    const short = { start_date: "2026-10-01", end_date: "2026-10-15" };
    expect(blockWeek(short, "2026-10-10")).toMatchObject({ week: 2, deload: false });
  });

  it("antes de começar, semana zero", () => {
    expect(blockWeek(BLOCK, "2026-09-30")).toMatchObject({ week: 0, deload: false });
  });

  it("descarga é metade das séries, para cima, e nunca zero", () => {
    expect(deloadSets(4)).toBe(2);
    expect(deloadSets(3)).toBe(2);
    expect(deloadSets(1)).toBe(1);
  });
});
