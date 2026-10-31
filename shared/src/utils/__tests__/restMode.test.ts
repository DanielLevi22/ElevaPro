import { describe, expect, it } from "vitest";
import { pausedDays, type RestPeriod, restingNow, returnWeekOf } from "../restMode";

const rest = (extra: Partial<RestPeriod>): RestPeriod => ({
  id: "pausa-1",
  starts_on: "2026-10-01",
  planned_until: null,
  ended_on: null,
  ...extra,
});

describe("o Modo Descanso", () => {
  it("vale do início até o fim previsto, e sem fim previsto até a volta", () => {
    expect(restingNow([rest({ planned_until: "2026-10-07" })], "2026-10-07")).not.toBeNull();
    expect(restingNow([rest({ planned_until: "2026-10-07" })], "2026-10-08")).toBeNull();
    expect(restingNow([rest({})], "2026-11-30")).not.toBeNull();
    expect(restingNow([rest({ ended_on: "2026-10-03" })], "2026-10-03")).toBeNull();
  });

  it("os dias pausados não quebram a sequência; o dia da volta já conta", () => {
    const days = pausedDays([rest({ ended_on: "2026-10-04" })], "2026-10-14");
    expect([...days]).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
  });

  it("depois de 10 dias ou mais de pausa, a semana seguinte é de retorno", () => {
    const long = rest({ ended_on: "2026-10-13" });
    expect(returnWeekOf([long], "2026-10-13")?.id).toBe("pausa-1");
    expect(returnWeekOf([long], "2026-10-19")?.id).toBe("pausa-1");
    expect(returnWeekOf([long], "2026-10-20")).toBeNull();
  });

  it("pausa curta não pede semana de retorno", () => {
    expect(returnWeekOf([rest({ ended_on: "2026-10-05" })], "2026-10-06")).toBeNull();
  });
});
