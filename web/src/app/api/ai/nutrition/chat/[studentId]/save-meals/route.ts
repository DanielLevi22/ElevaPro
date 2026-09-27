import { withAiRoute } from "@/lib/ai-route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { foodIdsByName } from "@/modules/ai/services/foodCatalog";
import { nutritionApprovalAccess } from "@/modules/ai/services/nutritionApprovalAccess";
import { loadNutritionDraft } from "@/modules/ai/services/nutritionDraftChat";
import { criarRotaDeAprovacao, especialistaDe } from "@/modules/ai/services/rotaDeAprovacao";
import type { DietMealsProposal } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. 60s é o
// máximo do plano Hobby.
export const maxDuration = 60;

/** Os nomes de alimento da proposta, na ordem em que aparecem. */
const nomesDosAlimentos = (proposta: DietMealsProposal): string[] =>
  proposta.meals.flatMap((m) => m.items.map((i) => i.food_name));

/**
 * Grava as refeições e seus itens no plano já salvo.
 *
 * Aqui a única coisa que pode faltar é o mapeamento nome → id, e nesse caso a
 * gravação é abortada inteira: refeição pela metade é pior que refeição
 * nenhuma, porque o especialista não tem como saber o que ficou de fora.
 */
export const POST = withAiRoute(
  criarRotaDeAprovacao<DietMealsProposal, { id: string; name: string }[]>({
    rotulo: "POST save-meals",
    chave: "pendingDietMeals",
    acesso: nutritionApprovalAccess,
    // `diet_meal_items` cai por cascata a partir de `diet_meals`.
    desfazerEm: "diet_meals",

    // Antes de reivindicar, de propósito: reivindicar é destrutivo, e recusar
    // depois consumiria a proposta para devolver um erro que a pessoa ainda
    // pode corrigir no chat.
    verificar: async ({ estado, specialistId }) => {
      if (!estado.savedDietPlanId) {
        return { erro: "Salve o plano alimentar antes.", status: 400 };
      }

      const pendente = estado.pendingDietMeals;
      if (!pendente) return null;

      const nomes = nomesDosAlimentos(pendente);
      const idsPorNome = await foodIdsByName(nomes, specialistId);
      const faltando = nomes.filter((n) => !idsPorNome.has(n));

      return faltando.length > 0
        ? { erro: `Alimentos não encontrados: ${faltando.join(", ")}`, status: 400 }
        : null;
    },

    gravar: async (ctx, proposta) => {
      const { estado, registrar } = ctx;
      const dietPlanId = estado.savedDietPlanId as string;
      const draft = await loadNutritionDraft(dietPlanId, ctx.studentId, especialistaDe(ctx));
      if (draft.plan_type !== proposta.plan_type)
        throw new Error("Tipo das refeições diferente do rascunho.");
      const idsPorNome = await foodIdsByName(nomesDosAlimentos(proposta), especialistaDe(ctx));
      const meals = proposta.meals.map((meal) => ({
        name: meal.name,
        meal_time: meal.meal_time ?? null,
        day_of_week: meal.day_of_week ?? null,
        items: meal.items.map((item) => ({
          food_id: idsPorNome.get(item.food_name) ?? null,
          quantity: item.quantity,
          unit: item.unit,
        })),
      }));
      const { data: saved, error } = await supabaseAdmin.rpc("append_diet_draft_meals", {
        p_plan_id: dietPlanId,
        p_student_id: ctx.studentId,
        p_specialist_id: especialistaDe(ctx),
        p_meals: meals,
      });
      if (error || !saved)
        throw new Error("Não foi possível adicionar o lote ao rascunho autorizado.");
      for (const meal of saved) registrar(meal.id);
      return saved;
    },

    resolver: (proposta) => ({ resolvedDietMeals: proposta }),

    mensagem: (_proposta, salvas) =>
      `✅ Refeições aprovadas e salvas: ${salvas.map((m) => m.name).join(", ")}.`,

    corpo: (_proposta, salvas) => ({ saved: salvas }),
  }),
);
