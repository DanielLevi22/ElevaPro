import { lerAnaliseDoPrato } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeStudentWithHealthConsent } from "@/lib/api-auth";
import { aiProviders } from "@/modules/ai/ai.config";
import { responderEmUmTurno } from "@/modules/ai/providers/turnoUnico";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

/**
 * O contrato ganhou `components` na issue #298, sem tirar nada: o app antigo lê
 * os mesmos campos de sempre, e o novo desenha "Componentes detectados" quando
 * o modelo separa o prato.
 */
const SYSTEM_PROMPT = `Você é um analista nutricional. Analise o prato na imagem e retorne APENAS JSON válido:
{"name":"Nome do prato em Português","calories":número,"protein":número,"carbs":número,"fat":número,"confidence":número entre 0 e 1,
"components":[{"name":"componente","grams":número,"calories":número,"protein":número,"carbs":número,"fat":número}]}
Separe o prato nos componentes que dá para ver, com as gramas estimadas de cada um. Os totais do prato são a soma dos componentes.
Se não for claro, estime com confidence menor. Nunca retorne texto fora do JSON.`;

export async function POST(request: NextRequest) {
  // A rota não lê nada do banco: só o modelo olha a foto. A checagem existe
  // para não deixar o endpoint de IA aberto a qualquer portador de token.
  const auth = await authorizeStudentWithHealthConsent(request);
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

  const analise = lerAnaliseDoPrato(texto);
  if (!analise) {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  return NextResponse.json(analise);
}
