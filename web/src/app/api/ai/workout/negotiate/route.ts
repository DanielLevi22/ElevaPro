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

  const prompt = `Você é um Personal Trainer expert do app "Eleva Pro".
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

  const { texto } = await responderEmUmTurno(aiProviders.fast, {
    systemBlocks: [],
    messages: [{ role: "user", content: prompt }],
    tools: [],
    maxTokens: 2048,
  });

  let result: AIWorkoutResponse;
  try {
    result = JSON.parse(texto.replace(/```json|```/g, "").trim()) as AIWorkoutResponse;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  return NextResponse.json(result);
}

export const POST = rotaDeIA(handlePost);
