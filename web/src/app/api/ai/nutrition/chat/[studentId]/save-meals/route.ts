import { type NextRequest, NextResponse } from "next/server";
import { rotaDeIA } from "@/lib/ai-route";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aprovarProposta } from "@/modules/ai/services/aprovacaoDaProposta";
import {
  getOrCreateSession,
  getSessionState,
  saveMessage,
  sessionOwnedBy,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import { foodIdsByName } from "@/modules/ai/services/foodCatalog";
import type { DietMealsProposal } from "@/modules/ai/types";

/**
 * Apaga as refeições que esta chamada chegou a criar.
 *
 * `diet_meal_items` tem `ON DELETE CASCADE` a partir de `diet_meals`, então
 * apagar a refeição leva os alimentos junto.
 */
async function apagarRefeicoes(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin.from("diet_meals").delete().in("id", ids);
  if (error) throw new Error(`falha ao desfazer as refeições ${ids.join(", ")}: ${error.message}`);
}

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

/**
 * Grava as refeições e seus itens no plano já salvo.
 *
 * A proposta vem do estado da sessão, e os alimentos já foram validados por
 * `unknownFoodNames` antes de ela ser guardada. Aqui a única coisa que pode
 * faltar é o mapeamento nome → id, e nesse caso a gravação é abortada inteira:
 * refeição pela metade é pior que refeição nenhuma, porque o especialista não
 * tem como saber o que ficou de fora.
 */
const handler = async (
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) => {
  const { studentId } = await params;

  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;
  const specialistId = auth.caller.id;

  // A proposta guardada vive no `state` da conversa que a produziu. Sem o
  // `sessionId` do cliente esta rota pegava a mais recente do módulo — e
  // aprovar numa conversa que não fosse a última respondia "nenhuma proposta
  // pendente" com a proposta na tela. O dono é validado porque o id vem do
  // cliente e o `service_role` abaixo não consulta RLS.
  const corpo = await request.json().catch(() => null);
  const pedida = typeof corpo?.sessionId === "string" ? corpo.sessionId : undefined;

  const sessionId = pedida
    ? await sessionOwnedBy(pedida, studentId, specialistId)
    : await getOrCreateSession(studentId, specialistId, "nutrition");

  if (!sessionId) {
    return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });
  }
  const state = await getSessionState(sessionId);
  const pendente = state.pendingDietMeals;
  const dietPlanId = state.savedDietPlanId;

  if (!pendente) {
    return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
  }
  if (!dietPlanId) {
    return NextResponse.json({ error: "Salve o plano alimentar antes." }, { status: 400 });
  }

  // A validação dos alimentos vem antes da reivindicação, de propósito: ela
  // responde 400 sem gravar nada, e reivindicar primeiro consumiria a proposta
  // para devolver um erro que a pessoa ainda pode corrigir no chat.
  const nomes = pendente.meals.flatMap((m) => m.items.map((i) => i.food_name));
  const idsPorNome = await foodIdsByName(nomes);
  const faltando = nomes.filter((n) => !idsPorNome.has(n));

  if (faltando.length > 0) {
    return NextResponse.json(
      { error: `Alimentos não encontrados: ${faltando.join(", ")}` },
      { status: 400 },
    );
  }

  const criadas: string[] = [];
  let aprovada: DietMealsProposal | undefined;

  let salvas: { id: string; name: string }[] | null;
  try {
    salvas = await aprovarProposta<DietMealsProposal, { id: string; name: string }[]>(
      sessionId,
      "pendingDietMeals",
      {
        gravar: async (proposal) => {
          aprovada = proposal;
          const gravadas: { id: string; name: string }[] = [];

          for (const [ordem, meal] of proposal.meals.entries()) {
            const { data: mealRow, error: mealError } = await supabaseAdmin
              .from("diet_meals")
              .insert({
                diet_plan_id: dietPlanId,
                name: meal.name,
                meal_order: ordem,
                meal_time: meal.meal_time ?? null,
                // NULL na dieta única, 0–6 na cíclica — são estruturas diferentes.
                day_of_week: proposal.plan_type === "cyclic" ? (meal.day_of_week ?? null) : null,
              })
              .select("id")
              .single();

            if (mealError || !mealRow) {
              throw new Error(mealError?.message ?? "insert de diet_meals não retornou");
            }
            criadas.push(mealRow.id);

            const itens = meal.items.map((item, index) => ({
              diet_meal_id: mealRow.id,
              food_id: idsPorNome.get(item.food_name) as string,
              quantity: item.quantity,
              unit: item.unit,
              order_index: index,
            }));

            if (itens.length > 0) {
              const { error: itemError } = await supabaseAdmin
                .from("diet_meal_items")
                .insert(itens);
              if (itemError) throw new Error(`itens de "${meal.name}": ${itemError.message}`);
            }

            gravadas.push({ id: mealRow.id, name: meal.name });
          }

          return gravadas;
        },
        desfazer: () => apagarRefeicoes(criadas),
      },
    );
  } catch (err) {
    console.error("[POST save-meals] especialista", specialistId, err);
    return NextResponse.json({ error: "Não consegui salvar as refeições." }, { status: 500 });
  }

  if (!salvas || !aprovada) {
    return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
  }

  await updateSessionState(sessionId, { resolvedDietMeals: aprovada });

  await saveMessage(
    sessionId,
    "assistant",
    `✅ Refeições aprovadas e salvas: ${salvas.map((m) => m.name).join(", ")}.`,
  );

  return NextResponse.json({ saved: salvas });
};

export const POST = rotaDeIA(handler);
