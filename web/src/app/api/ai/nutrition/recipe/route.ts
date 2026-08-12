import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

interface CookingStep {
  step: number;
  instruction: string;
  timerSeconds?: number | null;
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    mealName: string;
    ingredients: string[];
  };

  const { mealName, ingredients } = body;

  if (!mealName || !ingredients?.length) {
    return NextResponse.json({ error: "mealName and ingredients are required" }, { status: 400 });
  }

  const prompt = `Você é um instrutor culinário. Crie um guia passo-a-passo de preparo para uma refeição chamada "${mealName}" usando estes ingredientes: ${ingredients.join(", ")}.
Retorne APENAS um array JSON onde cada objeto tem:
- "step": número
- "instruction": string (max 150 caracteres, claro e direto, em Português do Brasil)
- "timerSeconds": número ou null (apenas se um tempo específico for mencionado)
Exemplo: [{"step": 1, "instruction": "Pique a cebola.", "timerSeconds": null}]`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  let steps: CookingStep[];
  try {
    steps = JSON.parse(text.replace(/```json|```/g, "").trim()) as CookingStep[];
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  return NextResponse.json(steps);
}
