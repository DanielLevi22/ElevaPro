import { describe, expect, it } from "vitest";
import { calculateTMB } from "../energyTargets";
import {
  practitionerDietTarget,
  practitionerDietTargetFromAnswers,
} from "../practitionerDietTarget";

/** 80 kg, 180 cm, 30 anos: TMB 1780 (o exemplo da `energyTargets`). */
const BASE = {
  age: 30,
  sex: "M" as const,
  heightCm: 180,
  weightKg: 80,
  dietScreening: "allowed" as const,
};

function target(overrides: Partial<Parameters<typeof practitionerDietTarget>[0]> = {}) {
  const result = practitionerDietTarget({ ...BASE, ...overrides });
  if (result.kind !== "target") throw new Error(`esperava meta, veio ${result.kind}`);
  return result;
}

describe("practitionerDietTarget", () => {
  it("triagem encaminhada não tem meta: sem dieta", () => {
    expect(practitionerDietTarget({ ...BASE, dietScreening: "referred" })).toEqual({
      kind: "no_diet",
    });
  });

  it("sem trava acionada, é a mesma conta da sugestão de meta", () => {
    const result = target({ mainGoal: "Hipertrofia", trainingDaysPerWeek: 4 });
    expect(result).toMatchObject({ tmb: 1780, tdee: 2759, goal: "bulking", targetCalories: 3035 });
    expect(result.guards).toEqual([]);
  });

  /**
   * TRAVA — a meta nunca fica abaixo da TMB (#365, ADR-0044). O sedentário em
   * corte caía em 1,2 × 0,8 = 0,96 × TMB, e não havia piso nenhum.
   */
  it("sobe ao piso da TMB o sedentário em corte", () => {
    const result = target({ mainGoal: "Emagrecimento" });
    if (result.targetCalories < result.tmb) {
      throw new Error(`META ABAIXO DA TMB: ${result.targetCalories} kcal com TMB ${result.tmb}`);
    }
    expect(result.targetCalories).toBe(1780);
    expect(result.guards).toContain("bmr_floor");
  });

  it("IMC abaixo de 18,5 não recebe meta de perda", () => {
    const result = target({ weightKg: 55, heightCm: 180, mainGoal: "Emagrecimento" });
    expect(result.goal).toBe("maintenance");
    expect(result.targetCalories).toBe(result.tdee);
    expect(result.guards).toContain("low_bmi_no_loss");
  });

  /**
   * Em obesidade, proteína e gordura por kg de peso total inflam a meta (130 kg
   * → 286 g de proteína) e espremem o carboidrato. A faixa da literatura é por
   * massa magra; sem ela, o peso de referência é o de IMC 25 (provisório, CRN).
   */
  it("em obesidade, calcula proteína pelo peso de referência, não pelo total", () => {
    const result = target({
      weightKg: 130,
      heightCm: 175,
      mainGoal: "Emagrecimento",
      trainingDaysPerWeek: 3,
    });
    expect(result.macros.protein).toBeLessThan(200);
    expect(result.macros.carbs).toBeGreaterThan(100);
    expect(result.guards).toContain("reference_weight");
  });
});

/** Uma grade de corpos e rotinas: as travas valem para todos, não para um exemplo. */
const GRADE = (() => {
  const casos = [];
  for (const sex of ["M", "F"] as const)
    for (const weightKg of [48, 60, 80, 110, 150])
      for (const heightCm of [150, 165, 180, 195])
        for (const age of [18, 35, 60])
          for (const trainingDaysPerWeek of [0, 2, 4, 6])
            for (const mainGoal of ["Emagrecimento", "Hipertrofia", "Saúde / Bem-estar"])
              casos.push({ ...BASE, sex, weightKg, heightCm, age, trainingDaysPerWeek, mainGoal });
  return casos;
})();

describe("com o % de gordura do scan", () => {
  /**
   * A faixa da literatura é por massa magra (Helms 2014: 2,3–3,1 g/kg no
   * corte). Com o scan, a proteína deixa de depender do peso total.
   */
  it("calcula a proteína pela massa magra e diz que foi assim", () => {
    // 80 kg com 25% de gordura: 60 kg de massa magra × 2,5 = 150 g.
    const result = target({ mainGoal: "Emagrecimento", trainingDaysPerWeek: 3, bodyFatPct: 25 });
    expect(result.macros.protein).toBe(150);
    expect(result.guards).toContain("lean_mass");
  });

  it("as calorias continuam as mesmas: só a divisão entre os macros muda", () => {
    const sem = target({ mainGoal: "Emagrecimento", trainingDaysPerWeek: 3 });
    const com = target({ mainGoal: "Emagrecimento", trainingDaysPerWeek: 3, bodyFatPct: 25 });
    expect(com.targetCalories).toBe(sem.targetCalories);
  });

  it("% de gordura fora do plausível é ignorado, e não vira massa magra inventada", () => {
    expect(target({ bodyFatPct: 90 }).guards).not.toContain("lean_mass");
  });
});

describe("as travas valem para qualquer corpo", () => {
  it("a meta nunca fica abaixo da TMB", () => {
    for (const caso of GRADE) {
      const result = target(caso);
      const tmb = calculateTMB(caso);
      if (result.targetCalories < tmb) {
        throw new Error(
          `META ABAIXO DA TMB: ${JSON.stringify(caso)} → ${result.targetCalories} < ${tmb}`,
        );
      }
    }
  });

  /** ~1% do peso por semana: 1% × 7.700 kcal/kg ÷ 7 dias = 11 kcal por kg por dia. */
  it("o déficit nunca passa de ~1% do peso por semana", () => {
    for (const caso of GRADE) {
      const result = target(caso);
      const deficit = result.tdee - result.targetCalories;
      if (deficit > 11 * caso.weightKg) {
        throw new Error(
          `RITMO ACIMA DE 1%: ${JSON.stringify(caso)} → déficit de ${deficit} kcal/dia`,
        );
      }
    }
  });

  it("nenhum macro sai negativo", () => {
    for (const caso of GRADE) {
      const { macros } = target(caso);
      expect(Math.min(macros.protein, macros.carbs, macros.fat)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("practitionerDietTargetFromAnswers", () => {
  const RESPOSTAS = {
    age: 30,
    height: 180,
    weight: 80,
    gender: "Masculino",
    main_goal: "Hipertrofia",
    training_days: 4,
    diet_screening: "allowed",
  };

  it("lê as respostas gravadas e faz a mesma conta da meta", () => {
    expect(practitionerDietTargetFromAnswers(RESPOSTAS)).toEqual(
      practitionerDietTarget({ ...BASE, mainGoal: "Hipertrofia", trainingDaysPerWeek: 4 }),
    );
  });

  it("sem a triagem liberada, não há dieta, mesmo com o corpo completo", () => {
    expect(practitionerDietTargetFromAnswers({ ...RESPOSTAS, diet_screening: "referred" })).toEqual(
      {
        kind: "no_diet",
      },
    );
  });

  it("sem os números do corpo, não inventa meta", () => {
    expect(practitionerDietTargetFromAnswers({ ...RESPOSTAS, weight: undefined })).toBeNull();
  });

  it("no caminho só dieta, 0 dia de exercício conta como sedentário, e não vira o padrão", () => {
    expect(practitionerDietTargetFromAnswers({ ...RESPOSTAS, training_days: 0 })).toEqual(
      practitionerDietTarget({ ...BASE, mainGoal: "Hipertrofia", trainingDaysPerWeek: 0 }),
    );
  });

  it("quem pulou O6 conta com o padrão de 3 dias", () => {
    const { training_days: _, ...semDias } = RESPOSTAS;
    expect(practitionerDietTargetFromAnswers(semDias)).toEqual(
      practitionerDietTarget({ ...BASE, mainGoal: "Hipertrofia", trainingDaysPerWeek: 3 }),
    );
  });
});
