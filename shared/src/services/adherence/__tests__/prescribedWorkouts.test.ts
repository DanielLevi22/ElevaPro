import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { countPrescribedWorkouts } from "../prescribedWorkouts";

describe("countPrescribedWorkouts", () => {
  it("conta os treinos com dia da fase ativa da periodização ativa", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "per-1" } },
      { data: { id: "plan-1" } },
      { data: [], count: 4 },
    ]);

    expect(await countPrescribedWorkouts(supabase, "aluno-1")).toBe(4);
    expect(chamadas.map((call) => call.tabela)).toEqual([
      "training_periodizations",
      "training_plans",
      "workouts",
    ]);
    expect(chamadas[2].filtros).toMatchObject({ training_plan_id: "plan-1" });
  });

  it("sem periodização, sem fase ou sem treino com dia: nulo, nunca 0", async () => {
    const semPeriodizacao = criarSupabaseFake({ data: null });
    expect(await countPrescribedWorkouts(semPeriodizacao.supabase, "a")).toBeNull();

    const semFase = criarSupabaseFake([{ data: { id: "per-1" } }, { data: null }]);
    expect(await countPrescribedWorkouts(semFase.supabase, "a")).toBeNull();

    // 0 faria qualquer semana parecer completa ("0 de 0").
    const semDia = criarSupabaseFake([
      { data: { id: "per-1" } },
      { data: { id: "p" } },
      { count: 0 },
    ]);
    expect(await countPrescribedWorkouts(semDia.supabase, "a")).toBeNull();
  });
});
