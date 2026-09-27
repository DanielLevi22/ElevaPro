import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createNutritionService } from "../nutrition.service";

describe("nutritionService — sugestão de restrições pela anamnese", () => {
  it("lê só o campo nomeado da anamnese, nunca as respostas inteiras", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });

    await createNutritionService(supabase).fetchDietaryRestrictionHint("aluno-1");

    expect(chamadas[0].tabela).toBe("student_anamnesis");
    expect(chamadas[0].select).toBe("dietary_restrictions:responses->dietary_restrictions");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1" });
  });

  // LGPD (Art. 6°, III): o que sai do serviço é a etiqueta derivada e um aviso,
  // nunca a resposta — "Diabetes" não atravessa para a tela do plano.
  it("devolve as etiquetas e o aviso, sem a resposta da anamnese", async () => {
    const { supabase } = criarSupabaseFake({
      data: { dietary_restrictions: ["Diabetes", "Intolerante a Lactose"] },
    });

    const hint = await createNutritionService(supabase).fetchDietaryRestrictionHint("aluno-1");

    expect(hint).toEqual({ suggested: ["lactose_free"], hasOtherNotes: true });
    expect(JSON.stringify(hint)).not.toMatch(/diab/i);
  });

  it("sem anamnese, não sugere nada", async () => {
    const { supabase } = criarSupabaseFake({ data: null });

    const hint = await createNutritionService(supabase).fetchDietaryRestrictionHint("aluno-1");

    expect(hint).toEqual({ suggested: [], hasOtherNotes: false });
  });

  it("propaga o erro em vez de sugerir vazio", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });

    await expect(
      createNutritionService(supabase).fetchDietaryRestrictionHint("aluno-1"),
    ).rejects.toEqual({ message: "42501" });
  });
});

describe("nutritionService — sugestão de meta calórica", () => {
  const ANAMNESE = {
    age: { questionId: "age", value: 30 },
    gender: "Masculino",
    height: "180",
    weight: "85",
    weekly_frequency: 4,
    profession_routine: "Sedentário",
    main_goal: "Emagrecimento",
  };

  it("lê só os campos nomeados da anamnese", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: ANAMNESE }, { data: null }]);

    await createNutritionService(supabase).fetchDietGoalSuggestion("aluno-1");

    expect(chamadas[0].select).toBe(
      "age:responses->age, gender:responses->gender, height:responses->height, weight:responses->weight, weekly_frequency:responses->weekly_frequency, profession_routine:responses->profession_routine, main_goal:responses->main_goal",
    );
  });

  // A medida do especialista vale mais que a declarada na anamnese.
  it("usa peso e altura da última avaliação quando existe", async () => {
    const { supabase } = criarSupabaseFake([
      { data: ANAMNESE },
      { data: { weight_kg: "80", height_cm: "180" } },
    ]);

    const goal = await createNutritionService(supabase).fetchDietGoalSuggestion("aluno-1");

    expect(goal?.tmb).toBe(1780);
  });

  // Minimização: a tela recebe a conta pronta, não idade e sexo do aluno.
  it("devolve só a conta, sem os dados do aluno", async () => {
    const { supabase } = criarSupabaseFake([{ data: ANAMNESE }, { data: null }]);

    const goal = await createNutritionService(supabase).fetchDietGoalSuggestion("aluno-1");

    expect(Object.keys(goal ?? {}).sort()).toEqual(
      ["deltaKcal", "goal", "macros", "targetCalories", "tdee", "tmb"].sort(),
    );
  });

  it("sem anamnese, não sugere", async () => {
    const { supabase } = criarSupabaseFake([{ data: null }, { data: null }]);

    expect(await createNutritionService(supabase).fetchDietGoalSuggestion("aluno-1")).toBeNull();
  });
});
