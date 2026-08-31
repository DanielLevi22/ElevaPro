import { type NextRequest, NextResponse } from "next/server";
import { authorizeStudent } from "@/lib/api-auth";
import { aiProviders } from "@/modules/ai/ai.config";
import { responderEmUmTurno } from "@/modules/ai/providers/turnoUnico";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

interface FoodAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

const SYSTEM_PROMPT = `Você é um analista nutricional. Analise o alimento na imagem e retorne APENAS JSON válido:
{"name":"Nome da refeição em Português","calories":número,"protein":número,"carbs":número,"fat":número,"confidence":número entre 0 e 1}
Se não for claro, estime com confidence menor. Nunca retorne texto fora do JSON.`;

export async function POST(request: NextRequest) {
  // A rota não lê nada do banco: só o Gemini olha a foto. A checagem existe
  // para não deixar o endpoint de IA aberto a qualquer portador de token.
  const auth = await authorizeStudent(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { imageBase64?: string; mimeType?: string };
  const { imageBase64, mimeType = "image/jpeg" } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  // A rota que obrigou o `ContentBlock` a conhecer imagem: sem isso ela não
  // tinha como passar pelo provider, e ficaria de fora da promessa do
  // `ADR-0011` justamente por mandar foto.
  const { texto } = await responderEmUmTurno(aiProviders.reasoning, {
    systemBlocks: [{ text: SYSTEM_PROMPT }],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: imageBase64 },
          },
          { type: "text", text: "Analise este alimento e retorne o JSON com os macros." },
        ],
      },
    ],
    tools: [],
    maxTokens: 256,
  });

  let result: FoodAnalysisResult;
  try {
    result = JSON.parse(texto.replace(/```json|```/g, "").trim()) as FoodAnalysisResult;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  return NextResponse.json(result);
}
