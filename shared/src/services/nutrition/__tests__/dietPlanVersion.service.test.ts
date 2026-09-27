import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createNutritionService } from "../nutrition.service";

describe("edição de plano enviado", () => {
  it("abre uma versão em rascunho pela operação atômica, sem atualizar a dieta ativa", async () => {
    const { supabase, rpcs, chamadas } = criarSupabaseFake({
      data: { id: "draft-2", status: "draft", version: 2 },
    });
    const draft = await createNutritionService(supabase).createDietPlanVersion("active-1");
    expect(draft).toMatchObject({ id: "draft-2", status: "draft", version: 2 });
    expect(rpcs).toEqual([{ nome: "create_diet_plan_version", args: [{ p_plan_id: "active-1" }] }]);
    expect(chamadas).toEqual([]);
  });

  it("não simula edição quando o banco recusa a autorização", async () => {
    const { supabase } = criarSupabaseFake({ error: { code: "42501" } });
    await expect(
      createNutritionService(supabase).createDietPlanVersion("another-owner"),
    ).rejects.toEqual({ code: "42501" });
  });
});
