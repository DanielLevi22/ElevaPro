import { describe, expect, it } from "vitest";
import { type StallCheckIn, stalledWeek } from "../stagnation";

const WEEKS: StallCheckIn[] = [
  { weekStart: "2026-10-12", logging: "all" },
  { weekStart: "2026-10-05", logging: "followed_unlogged" },
  { weekStart: "2026-09-28", logging: "all" },
];
const weight = (assessedAt: string, weightKg: number) => ({ assessedAt, weightKg });
const FLAT = [
  weight("2026-10-12T08:00:00Z", 80),
  weight("2026-10-05T08:00:00Z", 80.1),
  weight("2026-09-28T08:00:00Z", 79.9),
  weight("2026-09-21T08:00:00Z", 80),
];

describe("stalledWeek", () => {
  it("três semanas seguindo a meta e o peso parado: estagnou", () => {
    expect(stalledWeek({ checkIns: WEEKS, weights: FLAT, expectedWeeklyKg: -0.5 })).toBe(
      "2026-10-12",
    );
  });

  it("o peso andou para o objetivo: não estagnou", () => {
    const losing = [weight("2026-10-12T08:00:00Z", 79), ...FLAT.slice(1)];
    expect(stalledWeek({ checkIns: WEEKS, weights: losing, expectedWeeklyKg: -0.5 })).toBeNull();
  });

  // Para quem quer ganhar, perder também é ficar parado em relação ao objetivo.
  it("vale para ganho: o peso que não sobe estagnou", () => {
    expect(stalledWeek({ checkIns: WEEKS, weights: FLAT, expectedWeeklyKg: 0.25 })).toBe(
      "2026-10-12",
    );
  });

  it("quem mantém o peso não tem estagnação", () => {
    expect(stalledWeek({ checkIns: WEEKS, weights: FLAT, expectedWeeklyKg: 0 })).toBeNull();
  });

  // "Com a meta seguida": semana parcial ou fora do plano explica o peso parado.
  it("uma semana sem seguir a meta não conta", () => {
    const partial = [WEEKS[0], { ...WEEKS[1], logging: "partial" as const }, WEEKS[2]];
    expect(
      stalledWeek({ checkIns: partial as StallCheckIn[], weights: FLAT, expectedWeeklyKg: -0.5 }),
    ).toBeNull();
  });

  it("check-in pulado quebra a sequência", () => {
    const gap = [WEEKS[0], WEEKS[1], { weekStart: "2026-09-21", logging: "all" as const }];
    expect(stalledWeek({ checkIns: gap, weights: FLAT, expectedWeeklyKg: -0.5 })).toBeNull();
  });

  it("menos de três check-ins ainda não diz nada", () => {
    expect(
      stalledWeek({ checkIns: WEEKS.slice(0, 2), weights: FLAT, expectedWeeklyKg: -0.5 }),
    ).toBeNull();
  });

  it("sem a pesagem desta semana ou a de antes das três, não decide", () => {
    expect(
      stalledWeek({ checkIns: WEEKS, weights: FLAT.slice(1), expectedWeeklyKg: -0.5 }),
    ).toBeNull();
    expect(
      stalledWeek({ checkIns: WEEKS, weights: FLAT.slice(0, 3), expectedWeeklyKg: -0.5 }),
    ).toBeNull();
  });
});
