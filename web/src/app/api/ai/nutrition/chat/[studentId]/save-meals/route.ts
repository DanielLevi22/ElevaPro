import { withAiRoute } from "@/lib/ai-route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { foodIdsByName } from "@/modules/ai/services/foodCatalog";
import { acessoDoEspecialista, criarRotaDeAprovacao } from "@/modules/ai/services/rotaDeAprovacao";
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
    acesso: acessoDoEspecialista("nutrition"),
    // `diet_meal_items` cai por cascata a partir de `diet_meals`.
    desfazerEm: "diet_meals",

    // Antes de reivindicar, de propósito: reivindicar é destrutivo, e recusar
    // depois consumiria a proposta para devolver um erro que a pessoa ainda
    // pode corrigir no chat.
    verificar: async ({ estado }) => {
      if (!estado.savedDietPlanId) {
        return { erro: "Salve o plano alimentar antes.", status: 400 };
      }

      const pendente = estado.pendingDietMeals;
      if (!pendente) return null;

      const nomes = nomesDosAlimentos(pendente);
      const idsPorNome = await foodIdsByName(nomes);
      const faltando = nomes.filter((n) => !idsPorNome.has(n));

      return faltando.length > 0
        ? { erro: `Alimentos não encontrados: ${faltando.join(", ")}`, status: 400 }
        : null;
    },

    gravar: async ({ estado, registrar }, proposta) => {
      const dietPlanId = estado.savedDietPlanId as string;
      const idsPorNome = await foodIdsByName(nomesDosAlimentos(proposta));
      const gravadas: { id: string; name: string }[] = [];

      for (const [ordem, meal] of proposta.meals.entries()) {
        const { data: mealRow, error: mealError } = await supabaseAdmin
          .from("diet_meals")
          .insert({
            diet_plan_id: dietPlanId,
            name: meal.name,
            meal_order: ordem,
            meal_time: meal.meal_time ?? null,
            // NULL na dieta única, 0–6 na cíclica — são estruturas diferentes.
            day_of_week: proposta.plan_type === "cyclic" ? (meal.day_of_week ?? null) : null,
          })
          .select("id")
          .single();

        if (mealError || !mealRow) {
          throw new Error(mealError?.message ?? "insert de diet_meals não retornou");
        }
        registrar(mealRow.id);

        const itens = meal.items.map((item, index) => ({
          diet_meal_id: mealRow.id,
          food_id: idsPorNome.get(item.food_name) as string,
          quantity: item.quantity,
          unit: item.unit,
          order_index: index,
        }));

        if (itens.length > 0) {
          const { error: itemError } = await supabaseAdmin.from("diet_meal_items").insert(itens);
          if (itemError) throw new Error(`itens de "${meal.name}": ${itemError.message}`);
        }

        gravadas.push({ id: mealRow.id, name: meal.name });
      }

      return gravadas;
    },

    resolver: (proposta) => ({ resolvedDietMeals: proposta }),

    mensagem: (_proposta, salvas) =>
      `✅ Refeições aprovadas e salvas: ${salvas.map((m) => m.name).join(", ")}.`,

    corpo: (_proposta, salvas) => ({ saved: salvas }),
  }),
);
