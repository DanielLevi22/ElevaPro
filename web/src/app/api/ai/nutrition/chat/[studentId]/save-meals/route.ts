import { type NextRequest, NextResponse } from "next/server";
import { rotaDeIA } from "@/lib/ai-route";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getOrCreateSession,
  getSessionState,
  saveMessage,
  sessionOwnedBy,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import { foodIdsByName } from "@/modules/ai/services/foodCatalog";

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
  const proposal = state.pendingDietMeals;
  const dietPlanId = state.savedDietPlanId;

  if (!proposal) {
    return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
  }
  if (!dietPlanId) {
    return NextResponse.json({ error: "Salve o plano alimentar antes." }, { status: 400 });
  }

  const nomes = proposal.meals.flatMap((m) => m.items.map((i) => i.food_name));
  const idsPorNome = await foodIdsByName(nomes);
  const faltando = nomes.filter((n) => !idsPorNome.has(n));

  if (faltando.length > 0) {
    return NextResponse.json(
      { error: `Alimentos não encontrados: ${faltando.join(", ")}` },
      { status: 400 },
    );
  }

  const salvas: { id: string; name: string }[] = [];

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
      console.error("[POST save-meals] especialista", specialistId, mealError);
      return NextResponse.json({ error: "Não consegui salvar as refeições." }, { status: 500 });
    }

    const itens = meal.items.map((item, index) => ({
      diet_meal_id: mealRow.id,
      food_id: idsPorNome.get(item.food_name) as string,
      quantity: item.quantity,
      unit: item.unit,
      order_index: index,
    }));

    if (itens.length > 0) {
      const { error: itemError } = await supabaseAdmin.from("diet_meal_items").insert(itens);
      if (itemError) {
        console.error("[POST save-meals] itens", specialistId, itemError);
        return NextResponse.json({ error: "Não consegui salvar os alimentos." }, { status: 500 });
      }
    }

    salvas.push({ id: mealRow.id, name: meal.name });
  }

  await updateSessionState(sessionId, {
    pendingDietMeals: undefined,
    resolvedDietMeals: proposal,
  });

  await saveMessage(
    sessionId,
    "assistant",
    `✅ Refeições aprovadas e salvas: ${salvas.map((m) => m.name).join(", ")}.`,
  );

  return NextResponse.json({ saved: salvas });
};

export const POST = rotaDeIA(handler);
