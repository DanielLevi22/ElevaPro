import { describe, expect, it } from "vitest";
import type { Recalibration } from "../../../utils/weeklyRecalibration";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createWeeklyCheckInService, currentWeekStart } from "../weeklyCheckIn.service";

const SEMANA = currentWeekStart();
const CHECK_IN = {
  id: "check-1",
  week_start: SEMANA,
  logging: "all" as const,
  assessment_id: "medida-nova",
  status: "pending" as const,
};
const RESPOSTAS = {
  age: 29,
  height: 172,
  weight: 78,
  gender: "Feminino",
  main_goal: "Emagrecimento",
  training_days: 4,
  diet_screening: "allowed",
};

describe("o check-in da semana", () => {
  it("monta a proposta do Praticante com o peso da semana e o anterior", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { count: 0 },
      { data: { target_calories: 2150 } },
      { data: RESPOSTAS },
      {
        data: [
          { id: "medida-nova", assessed_at: `${SEMANA}T10:00:00Z`, weight_kg: 77.9 },
          { id: "medida-antiga", assessed_at: "2026-01-05T10:00:00Z", weight_kg: 78 },
        ],
      },
    ]);
    const proposta = await createWeeklyCheckInService(supabase).proposal("aluno-1", CHECK_IN);

    if (proposta.kind !== "proposal") throw new Error(`esperava proposta, veio ${proposta.kind}`);
    expect(proposta.targetCalories).toBe(2150);
    expect(proposta.recalibration.actualChangeKg).toBeCloseTo(-0.1, 5);
    expect(chamadas.find((c) => c.tabela === "diet_plans")?.filtros).toMatchObject({
      student_id: "aluno-1",
      status: "active",
    });
  });

  /**
   * TRAVA — a anamnese tem condição clínica, medicação e lesão; a meta usa sete
   * campos. Ler `responses` inteiro traria o resto para o aparelho sem
   * finalidade (LGPD Art. 6°, III).
   */
  it("lê da anamnese só os campos da meta, nunca as respostas inteiras", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { count: 0 },
      { data: { target_calories: 2150 } },
      { data: RESPOSTAS },
      { data: [] },
    ]);
    await createWeeklyCheckInService(supabase).proposal("aluno-1", CHECK_IN);

    const anamnese = chamadas.find((c) => c.tabela === "student_anamnesis")?.select ?? "";
    if (/(^|[\s,])responses(\s*,|\s*$)/.test(anamnese) || anamnese.includes("*")) {
      throw new Error(`ANAMNESE INTEIRA NO CHECK-IN: o serviço pediu "${anamnese}"`);
    }
    expect(anamnese).toContain("responses->diet_screening");
  });

  /**
   * TRAVA — o Aluno não ajusta a própria meta (ADR-0030, #376): com
   * especialista, o app não lê peso nem dieta para propor nada.
   */
  it("com especialista ativo, a proposta é do especialista e nada mais é lido", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ count: 1 }]);
    const proposta = await createWeeklyCheckInService(supabase).proposal("aluno-1", {
      ...CHECK_IN,
      assessment_id: null,
    });

    expect(proposta).toEqual({ kind: "specialist" });
    if (chamadas.length !== 1) {
      throw new Error(
        `AJUSTE SEM O ESPECIALISTA: o app leu ${chamadas.map((c) => c.tabela).join(", ")} para o Aluno`,
      );
    }
  });

  it("aprova pela função do banco, com o motivo da regra", async () => {
    const { supabase, rpcs } = criarSupabaseFake([{ data: null }]);
    const ajuste: Recalibration = {
      verdict: "weight_above_pace",
      proposedCalories: 2000,
      deltaCalories: -150,
      expectedChangeKg: -0.5,
      actualChangeKg: -0.1,
    };
    await createWeeklyCheckInService(supabase).approve("check-1", ajuste);
    expect(rpcs).toEqual([
      {
        nome: "apply_weekly_calorie_adjustment",
        args: [{ p_check_in_id: "check-1", p_new_calories: 2000, p_reason: "weight_above_pace" }],
      },
    ]);
  });

  it("não manda ao banco um ajuste que não muda nada", async () => {
    const { supabase, rpcs } = criarSupabaseFake([]);
    const semMudanca: Recalibration = {
      verdict: "on_pace",
      proposedCalories: 2150,
      deltaCalories: 0,
      expectedChangeKg: -0.5,
      actualChangeKg: -0.5,
    };
    await expect(
      createWeeklyCheckInService(supabase).approve("check-1", semMudanca),
    ).rejects.toThrow(/sem mudança \(on_pace\)/);
    expect(rpcs).toEqual([]);
  });
});

describe("o estado da semana na tela inicial", () => {
  it("o check-in é devido quando há dieta ativa desde antes desta semana", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: null }, { count: 1 }]);
    expect(await createWeeklyCheckInService(supabase).summary("aluno-1")).toEqual({
      state: "due",
    });
    expect(chamadas[1].metodos).toContainEqual({ nome: "lt", args: ["start_date", SEMANA] });
  });

  it("na primeira semana do plano não há o que comparar", async () => {
    const { supabase } = criarSupabaseFake([{ data: null }, { count: 0 }]);
    expect(await createWeeklyCheckInService(supabase).summary("aluno-1")).toEqual({
      state: "none",
    });
  });

  it("o check-in de uma semana antiga não conta para esta", async () => {
    const { supabase } = criarSupabaseFake([
      { data: { ...CHECK_IN, week_start: "2026-01-05", status: "approved" } },
      { count: 1 },
    ]);
    expect((await createWeeklyCheckInService(supabase).summary("aluno-1")).state).toBe("due");
  });

  it("aprovado nesta semana, traz a meta nova para o cartão", async () => {
    const { supabase } = criarSupabaseFake([
      { data: { ...CHECK_IN, status: "approved" } },
      { data: { target_calories: 2000 } },
    ]);
    expect(await createWeeklyCheckInService(supabase).summary("aluno-1")).toMatchObject({
      state: "approved",
      targetCalories: 2000,
    });
  });
});

describe("a semana do check-in", () => {
  it("domingo à noite no Brasil ainda é a semana que começou na segunda", () => {
    expect(currentWeekStart(new Date("2026-10-11T23:00:00-03:00"))).toBe("2026-10-05");
  });

  it("a semana vira na segunda à meia-noite do Brasil, não do UTC", () => {
    expect(currentWeekStart(new Date("2026-10-12T00:30:00-03:00"))).toBe("2026-10-12");
    expect(currentWeekStart(new Date("2026-10-12T01:00:00Z"))).toBe("2026-10-05");
  });
});
