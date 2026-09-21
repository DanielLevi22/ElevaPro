import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createWorkoutsService } from "../workouts.service";

describe("workoutsService — sinais vitais da sessão", () => {
  it("grava a média e as cinco zonas na linha da sessão", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).saveSessionVitals("sessao-1", {
      avgHeartRate: 152,
      zones: { zone1: 10, zone2: 30, zone3: 40, zone4: 15, zone5: 5 },
    });

    expect(chamadas[0].tabela).toBe("workout_session_vitals");
    expect(chamadas[0].payload).toEqual({
      session_id: "sessao-1",
      avg_heart_rate: 152,
      zone_1_pct: 10,
      zone_2_pct: 30,
      zone_3_pct: 40,
      zone_4_pct: 15,
      zone_5_pct: 5,
    });
  });

  it("sem zonas, grava só a média e deixa as cinco nulas", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).saveSessionVitals("sessao-1", {
      avgHeartRate: 152,
      zones: null,
    });

    expect(chamadas[0].payload).toEqual({
      session_id: "sessao-1",
      avg_heart_rate: 152,
      zone_1_pct: null,
      zone_2_pct: null,
      zone_3_pct: null,
      zone_4_pct: null,
      zone_5_pct: null,
    });
  });

  // LGPD, Art. 6°, III, e ADR-0024. A série de batimentos permite inferir estresse e
  // crise de ansiedade. O que atravessa para o banco é a média e cinco percentuais;
  // uma lista no payload, mesmo que o banco a recusasse, já teria saído do aparelho.
  it("a gravação dos sinais vitais nunca leva a série de batimentos", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});
    const vitals = JSON.parse(
      JSON.stringify({ avgHeartRate: 150, zones: null, samples: [148, 150, 152] }),
    );

    await createWorkoutsService(supabase).saveSessionVitals("sessao-1", vitals);

    const payload = JSON.stringify(chamadas[0].payload);
    if (payload.includes("[") || payload.includes("samples")) {
      throw new Error(`SÉRIE DE BATIMENTOS NO BANCO: o payload levou ${payload}`);
    }
  });
});
