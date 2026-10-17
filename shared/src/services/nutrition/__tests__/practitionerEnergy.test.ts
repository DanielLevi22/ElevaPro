import { describe, expect, it } from "vitest";
import { practitionerDietTargetFromAnswers } from "../../../utils/practitionerDietTarget";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { practitionerEnergy, targetAnswers } from "../practitionerEnergy";

const ANSWERS = {
  age: 30,
  height: 180,
  weight: 80,
  gender: "Masculino",
  main_goal: "Hipertrofia",
  training_days: 4,
  diet_screening: "allowed",
};

describe("practitionerEnergy", () => {
  it("devolve o gasto das respostas e a meta da dieta ativa", async () => {
    const { supabase } = criarSupabaseFake([
      { data: ANSWERS },
      { data: { target_calories: "2900" } },
    ]);
    const expected = practitionerDietTargetFromAnswers(ANSWERS);
    if (expected?.kind !== "target") throw new Error("fixture sem meta");

    expect(await practitionerEnergy(supabase, "aluno-1")).toEqual({
      tdee: expected.tdee,
      targetCalories: 2900,
    });
  });

  it("sem dieta própria ativa, ou sem as respostas da conta, nulo", async () => {
    const semDieta = criarSupabaseFake([{ data: ANSWERS }, { data: null }]);
    expect(await practitionerEnergy(semDieta.supabase, "a")).toBeNull();

    const semRespostas = criarSupabaseFake([{ data: null }, { data: { target_calories: 2000 } }]);
    expect(await practitionerEnergy(semRespostas.supabase, "a")).toBeNull();
  });

  // Art. 6°, III: a anamnese tem dado de saúde que a meta não usa (lesão,
  // medicação, histórico). A leitura pede só os campos da conta.
  it("lê da anamnese só os campos que a meta usa, nunca as respostas inteiras", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: ANSWERS });
    await targetAnswers(supabase, "aluno-1");

    const select = chamadas[0].select ?? "";
    if (/(^|[\s,])responses(\s*,|\s*$)/.test(select) || select.includes("*")) {
      throw new Error(`ANAMNESE INTEIRA LIDA: o select pediu "${select}"`);
    }
    expect(select).not.toMatch(/injur|medica|condition/);
  });
});
