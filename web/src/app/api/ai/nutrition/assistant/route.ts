import Anthropic from "@anthropic-ai/sdk";
import { type NextRequest, NextResponse } from "next/server";
import { rotaDeIA } from "@/lib/ai-route";
import { authorizeUser } from "@/lib/api-auth";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

type PromptType = "recipes" | "analysis" | "tips" | "meal_prep" | "cooking_guide";

interface ShoppingCategory {
  category: string;
  items: { name: string; quantity: string }[];
}

const PROMPTS: Record<PromptType, string> = {
  recipes:
    "Você é um chef. Sugira 3 receitas simples e saudáveis usando principalmente os ingredientes desta lista de compras. Formate de forma agradável. Responda em Português do Brasil.",
  analysis:
    "Você é um nutricionista. Analise esta lista de compras. Ela é equilibrada? Faltam nutrientes essenciais (fibras, proteínas, vitaminas)? Seja conciso. Responda em Português do Brasil.",
  tips: "Você é um comprador proativo. Dê dicas específicas sobre como escolher a qualidade dos itens frescos (frutas/legumes/carnes) presentes nesta lista. Bullet points curtos. Responda em Português do Brasil.",
  meal_prep:
    "Você é um especialista em meal prep. Crie um guia passo-a-passo para cozinhar/preparar esses ingredientes de forma eficiente para a semana. Agrupe tarefas. Seja prático. Responda em Português do Brasil.",
  cooking_guide:
    "Você é um instrutor culinário. Escolha os componentes principais da refeição desta lista e ensine passo-a-passo como cozinhá-los perfeitamente. Foque na técnica. Responda em Português do Brasil.",
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const handler = async (request: NextRequest) => {
  // Antes: `getAuthenticatedUserId`, uma cópia local que fazia
  // `const { data } = await client.auth.getUser(token)` — descartando o erro — e
  // devolvia só "existe um usuário". Nunca dizia qual papel ele tem, e o
  // `check-api-auth.js` não pegava porque a rota não toca `supabaseAdmin`.
  // `authorizeUser` lê o `account_type` de `profiles`, não de `user_metadata`.
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    categories: ShoppingCategory[];
    promptType: PromptType;
  };

  const { categories, promptType } = body;

  if (!categories?.length || !promptType) {
    return NextResponse.json({ error: "categories and promptType are required" }, { status: 400 });
  }

  const systemPrompt = PROMPTS[promptType];
  if (!systemPrompt) {
    return NextResponse.json({ error: `Invalid promptType: ${promptType}` }, { status: 400 });
  }

  const itemsList = categories
    .map((cat) => `${cat.category}: ${cat.items.map((i) => i.name).join(", ")}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: `Lista de Compras:\n${itemsList}` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ response: text || "Não consegui gerar uma resposta." });
};

export const POST = rotaDeIA(handler);
