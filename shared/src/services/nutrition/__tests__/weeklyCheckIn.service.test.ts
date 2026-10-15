import { describe, expect, it } from "vitest";
import { currentWeekStart, isTodayInBrazil } from "../../../utils/dateOnly";
import type { Recalibration } from "../../../utils/weeklyRecalibration";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createWeeklyCheckInService } from "../weeklyCheckIn.service";

const SEMANA = currentWeekStart();
/** A segunda anterior: a pesagem de uma semana antes. */
const SEMANA_ANTERIOR = new Date(Date.parse(`${SEMANA}T12:00:00Z`) - 7 * 86_400_000)
  .toISOString()
  .slice(0, 10);
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
          { id: "medida-antiga", assessed_at: `${SEMANA_ANTERIOR}T10:00:00Z`, weight_kg: 78 },
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
   * especialista, o app não lê a dieta, a anamnese nem o peso declarado para
   * propor nada. Lê só quem revisa e a última medida dele.
   */
  it("com especialista ativo, mostra quem revisa e a medida dele, sem ler o peso declarado", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { count: 1 },
      { data: { specialist_id: "espec-1" } },
      { data: { assessed_at: "2026-10-01T10:00:00Z", weight_kg: 80.5 } },
      { data: { full_name: "Daniel Levi Souza" } },
    ]);
    const proposta = await createWeeklyCheckInService(supabase).proposal("aluno-1", {
      ...CHECK_IN,
      assessment_id: null,
    });

    expect(proposta).toEqual({
      kind: "specialist",
      specialistName: "Daniel S.",
      lastMeasurement: { assessedAt: "2026-10-01T10:00:00Z", weightKg: 80.5 },
    });
    const lidas = chamadas.map((c) => c.tabela);
    const medidas = chamadas.filter((c) => c.tabela === "physical_assessments");
    if (
      lidas.includes("diet_plans") ||
      lidas.includes("student_anamnesis") ||
      medidas.some((c) => c.filtros.measured_by !== "specialist")
    ) {
      throw new Error(`AJUSTE SEM O ESPECIALISTA: o app leu ${lidas.join(", ")} para o Aluno`);
    }
  });

  it("decidido, devolve o ajuste gravado em vez de recalcular sobre a meta nova", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { before_value: 3231, after_value: 3081, approved_at: "2026-10-13T13:20:00Z" } },
    ]);
    const proposta = await createWeeklyCheckInService(supabase).proposal("aluno-1", {
      ...CHECK_IN,
      status: "approved",
    });
    expect(proposta).toEqual({
      kind: "decided",
      status: "approved",
      adjustment: { beforeCalories: 3231, afterCalories: 3081, approvedAt: "2026-10-13T13:20:00Z" },
    });
    expect(chamadas.map((c) => c.tabela)).toEqual(["plan_adjustments"]);
  });

  /** Regressão: quem pulou check-in comparava três semanas com o ritmo de uma só. */
  it("divide a variação do peso pelas semanas desde a pesagem anterior", async () => {
    const { supabase } = criarSupabaseFake([
      { count: 0 },
      { data: { target_calories: 2150 } },
      { data: RESPOSTAS },
      {
        data: [
          { id: "medida-nova", assessed_at: "2026-10-26T10:00:00Z", weight_kg: 76.5 },
          { id: "medida-antiga", assessed_at: "2026-10-05T10:00:00Z", weight_kg: 78 },
        ],
      },
    ]);
    const proposta = await createWeeklyCheckInService(supabase).proposal("aluno-1", {
      ...CHECK_IN,
      week_start: "2026-10-26",
    });
    if (proposta.kind !== "proposal") throw new Error(`esperava proposta, veio ${proposta.kind}`);
    expect(proposta.recalibration.actualChangeKg).toBeCloseTo(-0.5, 5);
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

  it("desfaz pela função do banco", async () => {
    const { supabase, rpcs } = criarSupabaseFake([{ data: null }]);
    await createWeeklyCheckInService(supabase).undo("check-1");
    expect(rpcs).toEqual([
      { nome: "undo_weekly_calorie_adjustment", args: [{ p_check_in_id: "check-1" }] },
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

/** Nenhuma pausa do Modo Descanso: a primeira consulta do estado da semana. */
const SEM_PAUSA = { data: [] };

describe("o estado da semana na tela inicial", () => {
  // Modo Descanso (#376, A8): na pausa não há semana para contar.
  it("no Modo Descanso o check-in espera, mesmo devido", async () => {
    const hoje = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
    const { supabase, chamadas } = criarSupabaseFake([
      { data: [{ id: "p", starts_on: hoje, planned_until: null, ended_on: null }] },
    ]);
    expect(await createWeeklyCheckInService(supabase).summary("aluno-1")).toEqual({
      state: "none",
    });
    expect(chamadas).toHaveLength(1);
  });

  it("o check-in é devido quando há dieta ativa desde antes desta semana", async () => {
    const { supabase, chamadas } = criarSupabaseFake([SEM_PAUSA, { data: null }, { count: 1 }]);
    expect(await createWeeklyCheckInService(supabase).summary("aluno-1")).toEqual({
      state: "due",
    });
    expect(chamadas[2].metodos).toContainEqual({ nome: "lt", args: ["start_date", SEMANA] });
  });

  it("na primeira semana do plano não há o que comparar", async () => {
    const { supabase } = criarSupabaseFake([SEM_PAUSA, { data: null }, { count: 0 }]);
    expect(await createWeeklyCheckInService(supabase).summary("aluno-1")).toEqual({
      state: "none",
    });
  });

  it("o check-in de uma semana antiga não conta para esta", async () => {
    const { supabase } = criarSupabaseFake([
      SEM_PAUSA,
      { data: { ...CHECK_IN, week_start: "2026-01-05", status: "approved" } },
      { count: 1 },
    ]);
    expect((await createWeeklyCheckInService(supabase).summary("aluno-1")).state).toBe("due");
  });

  it("aprovado nesta semana, traz o ajuste gravado para o cartão", async () => {
    const { supabase } = criarSupabaseFake([
      SEM_PAUSA,
      { data: { ...CHECK_IN, status: "approved" } },
      { data: { before_value: 2150, after_value: 2000, approved_at: "2026-10-13T13:20:00Z" } },
    ]);
    expect(await createWeeklyCheckInService(supabase).summary("aluno-1")).toMatchObject({
      state: "approved",
      adjustment: { beforeCalories: 2150, afterCalories: 2000 },
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

  it("o dia do desfazer é o do Brasil: 22h de ontem no Brasil já é amanhã em UTC", () => {
    const agora = new Date("2026-10-13T12:00:00-03:00");
    expect(isTodayInBrazil("2026-10-13T00:30:00-03:00", agora)).toBe(true);
    expect(isTodayInBrazil("2026-10-12T22:00:00-03:00", agora)).toBe(false);
  });
});
