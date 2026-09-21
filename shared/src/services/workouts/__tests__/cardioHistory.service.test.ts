import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createCardioHistoryService } from "../cardioHistory.service";

const NOW = new Date("2026-09-14T12:00:00Z");

const RUNS = [
  { started_at: "2026-09-12T07:00:00Z", duration_seconds: 1680, distance_meters: 5100 },
  { started_at: "2026-09-04T07:00:00Z", duration_seconds: 2520, distance_meters: 7400 },
  { started_at: "2026-08-20T07:00:00Z", duration_seconds: 3000, distance_meters: 6900 },
];

describe("cardioHistoryService — histórico da modalidade", () => {
  it("devolve a última, a melhor por distância e o total do mês com gps", async () => {
    const { supabase } = criarSupabaseFake({ data: RUNS });

    const history = await createCardioHistoryService(supabase).fetchModalityHistory(
      "aluno-1",
      { activityName: "Corrida", usesGps: true },
      NOW,
    );

    expect(history).toEqual({
      last: { startedAt: "2026-09-12T07:00:00Z", durationSeconds: 1680, distanceMeters: 5100 },
      best: { startedAt: "2026-09-04T07:00:00Z", durationSeconds: 2520, distanceMeters: 7400 },
      monthDurationSeconds: 1680 + 2520,
    });
  });

  // No elíptico não há distância: "melhor" só pode ser a sessão mais longa.
  it("sem gps, a melhor é a mais longa", async () => {
    const { supabase } = criarSupabaseFake({ data: RUNS });

    const history = await createCardioHistoryService(supabase).fetchModalityHistory(
      "aluno-1",
      { activityName: "Elíptico", usesGps: false },
      NOW,
    );

    expect(history?.best?.startedAt).toBe("2026-08-20T07:00:00Z");
  });

  it("sem sessão na modalidade, não há histórico", async () => {
    const { supabase } = criarSupabaseFake({ data: [] });

    const history = await createCardioHistoryService(supabase).fetchModalityHistory(
      "aluno-1",
      { activityName: "Natação", usesGps: false },
      NOW,
    );

    expect(history).toBeNull();
  });

  it("pede só data, duração e distância das sessões de cardio da modalidade", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });

    await createCardioHistoryService(supabase).fetchModalityHistory(
      "aluno-1",
      { activityName: "Corrida", usesGps: true },
      NOW,
    );

    expect(chamadas[0].tabela).toBe("workout_sessions");
    expect(chamadas[0].select).toBe("started_at, duration_seconds, distance_meters");
    expect(chamadas[0].filtros).toEqual({
      student_id: "aluno-1",
      session_type: "cardio",
      activity_name: "Corrida",
    });
  });
});

describe("cardioHistoryService — última sessão de cardio", () => {
  it("devolve a modalidade e a duração da última sessão", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: { activity_name: "Bicicleta", duration_seconds: 1800 },
    });

    const last = await createCardioHistoryService(supabase).fetchLastCardio("aluno-1");

    expect(last).toEqual({ activityName: "Bicicleta", durationSeconds: 1800 });
    expect(chamadas[0].select).toBe("activity_name, duration_seconds");
    // Sem o filtro de cardio, o "Repetir a última" ofereceria uma sessão de musculação.
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1", session_type: "cardio" });
    expect(chamadas[0].metodos.map((metodo) => metodo.nome)).toContain("not");
  });

  it("sem sessão de cardio, não há o que repetir", async () => {
    const { supabase } = criarSupabaseFake({ data: null });

    expect(await createCardioHistoryService(supabase).fetchLastCardio("aluno-1")).toBeNull();
  });
});
