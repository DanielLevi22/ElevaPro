import { type NextRequest, NextResponse } from "next/server";
import { rotaDeIA } from "@/lib/ai-route";
import { authorizeUser } from "@/lib/api-auth";
import { aiProviders } from "@/modules/ai/ai.config";
import { responderEmUmTurno } from "@/modules/ai/providers/turnoUnico";

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

async function handlePost(request: NextRequest) {
  // Antes: `getAuthenticatedUserId`, uma cópia local que fazia
  // `const { data } = await client.auth.getUser(token)` — descartando o erro — e
  // devolvia só "existe um usuário". Nunca dizia qual papel ele tem, e o
  // `check-api-auth.js` não pegava porque a rota não toca `supabaseAdmin`.
  // `authorizeUser` lê o `account_type` de `profiles`, não de `user_metadata`.
  const auth = await authorizeUser(request);
  if (!auth.ok) return auth.response;

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

  const prompt = `Você é um Personal Trainer expert do app "Eleva Pro".

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

  const { texto } = await responderEmUmTurno(aiProviders.fast, {
    systemBlocks: [],
    messages: [{ role: "user", content: prompt }],
    tools: [],
    maxTokens: 4096,
  });

  let result: Record<string, AIWorkoutResponse>;
  try {
    result = JSON.parse(texto.replace(/```json|```/g, "").trim()) as Record<
      string,
      AIWorkoutResponse
    >;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  return NextResponse.json(result);
}

export const POST = rotaDeIA(handlePost);
