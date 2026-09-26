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
