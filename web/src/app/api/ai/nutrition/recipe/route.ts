import Anthropic from "@anthropic-ai/sdk";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeUser } from "@/lib/api-auth";

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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  // Antes: `getAuthenticatedUserId`, uma cópia local que fazia
  // `const { data } = await client.auth.getUser(token)` — descartando o erro — e
  // devolvia só "existe um usuário". Nunca dizia qual papel ele tem, e o
  // `check-api-auth.js` não pegava porque a rota não toca `supabaseAdmin`.
  // `authorizeUser` lê o `account_type` de `profiles`, não de `user_metadata`.
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth.response;

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
