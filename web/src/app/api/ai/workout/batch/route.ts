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
    phases: { name: string; focus: string; weeks: number }[];
    split: string;
    goal: string;
    studentLevel: string;
    exercisesList: string;
    userContext?: string;
  };

  const { phases, split, goal, studentLevel, exercisesList, userContext } = body;

  if (!phases?.length || !split || !goal || !studentLevel || !exercisesList) {
    return NextResponse.json(
      { error: "phases, split, goal, studentLevel, exercisesList are required" },
      { status: 400 },
    );
  }

  const phaseSummary = phases
    .map((p, i) => `Fase ${i + 1}: ${p.name} (${p.weeks} semanas) - Foco: ${p.focus}`)
    .join("\n");

  const prompt = `Você é um Personal Trainer expert do app "Meu Personal".

TAREFA:
Gerar treinos para ${phases.length} FASES de uma periodização completa.

CONTEXTO DO ALUNO:
- Nível: ${studentLevel}
- Objetivo Geral: ${goal}
- Divisão de Treino: ${split} (Para TODAS as fases)
- Observações: ${userContext ?? "Nenhuma"}

ESTRUTURA DAS FASES:
${phaseSummary}

REGRAS:
1. Use APENAS exercícios da lista abaixo.
2. Mude a seleção de exercícios, volume e variáveis entre as fases para garantir progressão.
3. Para cada exercício, sugira uma CARGA/INTENSIDADE (ex: "RPE 8", "70% 1RM", "Falha Concêntrica").

LISTA DE EXERCÍCIOS:
${exercisesList}

Responda APENAS com JSON válido onde a chave é o ÍNDICE da fase (0, 1, 2...) e o valor é o plano:
{
  "0": { "explanation": "Fase 1 focada em...", "plan": [...] },
  "1": { "explanation": "...", "plan": [...] }
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  let result: Record<string, AIWorkoutResponse>;
  try {
    result = JSON.parse(text.replace(/```json|```/g, "").trim()) as Record<
      string,
      AIWorkoutResponse
    >;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  return NextResponse.json(result);
}
