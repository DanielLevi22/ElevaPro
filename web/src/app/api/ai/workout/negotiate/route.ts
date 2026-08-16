import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

interface AIWorkoutItem {
  exerciseName: string;
  sets: number;
  reps: string;
  rest: number;
  technique?: string;
  observation?: string;
  load_suggestion?: string;
}

interface AIWorkoutDay {
  letter: string;
  focus: string;
  exercises: AIWorkoutItem[];
}

interface AIWorkoutResponse {
  explanation: string;
  plan: AIWorkoutDay[];
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
    split: string;
    goal: string;
    studentLevel: string;
    exercisesList: string;
    userContext?: string;
  };

  const { split, goal, studentLevel, exercisesList, userContext } = body;

  if (!split || !goal || !studentLevel || !exercisesList) {
    return NextResponse.json(
      { error: "split, goal, studentLevel, exercisesList are required" },
      { status: 400 },
    );
  }

  const prompt = `Você é um Personal Trainer expert do app "Meu Personal".
Seu objetivo é criar treinos EXCELENTES e PERSONALIZADOS.

CONTEXTO DO ALUNO:
- Nível: ${studentLevel}
- Objetivo: ${goal}
- Divisão: ${split}
- Observações/Feedback: ${userContext ?? "Nenhuma"}

REGRAS DE OURO:
1. Use APENAS exercícios da lista abaixo. É CRÍTICO não inventar exercícios.
2. Adapte volume e técnica ao Nível (${studentLevel}).
3. Explique sua estratégia de forma clara, educada e profissional.
4. Se o usuário pediu mudanças, atenda prontamente mantendo a coerência.

LISTA DE EXERCÍCIOS DISPONÍVEIS:
${exercisesList}

Responda APENAS com JSON válido:
{
  "explanation": "Explique aqui por que escolheu essa estrutura...",
  "plan": [
    {
      "letter": "A",
      "focus": "Peitoral e Tríceps",
      "exercises": [
        { "exerciseName": "Nome Exato da Lista", "sets": 3, "reps": "10-12", "rest": 60, "technique": "Normal", "observation": "Bom para iniciantes" }
      ]
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  let result: AIWorkoutResponse;
  try {
    result = JSON.parse(text.replace(/```json|```/g, "").trim()) as AIWorkoutResponse;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  return NextResponse.json(result);
}
