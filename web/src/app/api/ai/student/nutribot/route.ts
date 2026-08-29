import Anthropic from "@anthropic-ai/sdk";
import { type NextRequest, NextResponse } from "next/server";
import { rotaDeIA } from "@/lib/ai-route";
import { authorizeStudent } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const handler = async (request: NextRequest) => {
  const auth = await authorizeStudent(request);
  if (!auth.ok) return auth.response;
  const studentId = auth.caller.id;

  const body = (await request.json()) as { message?: string; history?: ChatMessage[] };
  const { message, history = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const dietContext = await loadDietContext(studentId);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `Você é o NutriBot, assistente nutricional do app Eleva Pro. Responda em Português do Brasil.
Seja amigável, motivador e conciso. Evite conselhos médicos.
Use o plano do aluno como referência para sugestões de substituições e receitas.

PLANO ALIMENTAR DO ALUNO:
${dietContext}`,
    messages: [
      ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ],
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ reply });
};

export const POST = rotaDeIA(handler);
