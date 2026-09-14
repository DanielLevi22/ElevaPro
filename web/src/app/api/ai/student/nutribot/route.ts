import { separarSugestaoDaResposta } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { rotaDeIA } from "@/lib/ai-route";
import { authorizeStudentWithHealthConsent } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aiProviders } from "@/modules/ai/ai.config";
import { responderEmUmTurno } from "@/modules/ai/providers/turnoUnico";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function loadDietContext(studentId: string): Promise<string> {
  const { data: plans } = await supabaseAdmin
    .from("diet_plans")
    .select("id, name, target_calories, target_protein, target_carbs, target_fat")
    .eq("student_id", studentId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!plans) return "O aluno não possui plano alimentar ativo.";

  const { data: meals } = await supabaseAdmin
    .from("diet_meals")
    .select("id, name, meal_time, meal_type")
    .eq("diet_plan_id", plans.id)
    .order("meal_time");

  if (!meals?.length) return `Plano "${plans.name}" sem refeições cadastradas.`;

  const mealIds = meals.map((m) => m.id);
  const { data: items } = await supabaseAdmin
    .from("diet_meal_items")
    .select("diet_meal_id, quantity, unit, food:foods(name, calories, protein, carbs, fat)")
    .in("diet_meal_id", mealIds);

  const mealSummaries = meals.map((meal) => {
    const mealItems = items?.filter((i) => i.diet_meal_id === meal.id) ?? [];
    const itemLines = mealItems
      .map((i) => {
        const food = i.food as unknown as { name: string } | null;
        return `  - ${i.quantity}${i.unit} de ${food?.name ?? "alimento"}`;
      })
      .join("\n");
    return `${meal.name} (${meal.meal_time}):\n${itemLines || "  - sem alimentos"}`;
  });

  return `Plano: "${plans.name}" | ${plans.target_calories}kcal | P:${plans.target_protein}g C:${plans.target_carbs}g G:${plans.target_fat}g\n\n${mealSummaries.join("\n\n")}`;
}

const handler = async (request: NextRequest) => {
  const auth = await authorizeStudentWithHealthConsent(request);
  if (!auth.ok) return auth.response;
  const studentId = auth.caller.id;

  const body = (await request.json()) as { message?: string; history?: ChatMessage[] };
  const { message, history = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const dietContext = await loadDietContext(studentId);

  const { texto } = await responderEmUmTurno(aiProviders.fast, {
    systemBlocks: [
      {
        text: `Você é o NutriBot, assistente nutricional do app Eleva Pro. Responda em Português do Brasil.
Seja amigável, motivador e conciso. Evite conselhos médicos.
Use o plano do aluno como referência para sugestões de substituições e receitas.

Quando sugerir o que comer numa refeição do plano, com alimentos e quantidades
concretos, acrescente ao fim da resposta UM bloco, exatamente neste formato:
<sugestao>{"refeicao":"nome da refeição do plano","itens":[{"nome":"alimento","gramas":número,"calorias":número,"proteina":número,"carboidrato":número,"gordura":número}]}</sugestao>
Sem sugestão aplicável, não escreva o bloco. Nunca explique o bloco no texto.

PLANO ALIMENTAR DO ALUNO:
${dietContext}`,
      },
    ],
    messages: [
      ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ],
    tools: [],
    maxTokens: 512,
  });

  // O bloco sai do texto e vira campo próprio: o app antigo lê só `reply`, e o
  // novo desenha o cartão "Adicionar ao jantar" quando `sugestao` vem.
  const { resposta, sugestao } = separarSugestaoDaResposta(texto);
  return NextResponse.json({ reply: resposta, sugestao });
};

export const POST = rotaDeIA(handler);
