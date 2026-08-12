import Anthropic from "@anthropic-ai/sdk";
import { createHealthService } from "@elevapro/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

interface BodyScanPayload {
  metrics: {
    height: number;
    weight: number;
    bodyFat: number;
    muscleMass: number;
    bmi: number;
  };
  segments: {
    chest: number;
    waist: number;
    hips: number;
    arms: number;
    thighs: number;
    calves?: number;
    neck?: number;
    shoulders?: number;
  };
  postureAnalysis?: {
    scores: { symmetry: number; muscle: number; posture: number };
    feedback: {
      front: Array<{ title: string; risk: string; text: string }>;
      back: Array<{ title: string; risk: string; text: string }>;
      side: Array<{ title: string; risk: string; text: string }>;
    };
    recommendations: string;
  };
}

/**
 * Autentica pelo token do aluno e devolve o cliente já ligado a ele.
 *
 * O cliente volta junto de propósito: a checagem de consentimento roda com a
 * identidade do titular, sob RLS, em vez de `service_role`. Foto de corpo é o
 * dado mais sensível do sistema e não há motivo para essa rota ver mais do que
 * o próprio dono veria.
 */
async function authenticateStudent(
  request: NextRequest,
): Promise<{ userId: string; client: SupabaseClient } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data } = await client.auth.getUser(token);
  if (!data.user?.id) return null;
  return { userId: data.user.id, client };
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você é um especialista em avaliação física e análise postural. Analise as imagens corporais fornecidas e retorne APENAS JSON válido com esta estrutura exata:
{
  "metrics": { "height": number (cm), "weight": number (kg), "bodyFat": number (%), "muscleMass": number (kg), "bmi": number },
  "segments": { "chest": number (cm), "waist": number (cm), "hips": number (cm), "arms": number (cm), "thighs": number (cm), "calves": number, "neck": number, "shoulders": number },
  "postureAnalysis": {
    "scores": { "symmetry": number (0-100), "muscle": number (0-100), "posture": number (0-100) },
    "feedback": {
      "front": [{ "title": string, "risk": "ÓTIMO"|"BOM"|"NORMAL"|"MODERADO"|"ALTO", "text": string }],
      "back": [{ "title": string, "risk": "ÓTIMO"|"BOM"|"NORMAL"|"MODERADO"|"ALTO", "text": string }],
      "side": [{ "title": string, "risk": "ÓTIMO"|"BOM"|"NORMAL"|"MODERADO"|"ALTO", "text": string }]
    },
    "recommendations": string
  }
}
Nunca retorne texto fora do JSON. Estime com base nas imagens disponíveis.`;

export async function POST(request: NextRequest) {
  const auth = await authenticateStudent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Antes de ler o corpo da requisição, de propósito: sem consentimento a
  // imagem não deve nem ser desserializada aqui, muito menos sair para os EUA.
  // Pendência da seção 10 do LGPD_COMPLIANCE — Art. 11, I.
  let hasConsent: boolean;
  try {
    hasConsent = await createHealthService(auth.client).hasCollectionConsent(auth.userId);
  } catch {
    return NextResponse.json({ error: "consent_check_failed" }, { status: 503 });
  }

  if (!hasConsent) {
    // Código estável para o app distinguir "falta consentir" de "deu erro" e
    // oferecer o fluxo, em vez de mostrar falha genérica.
    return NextResponse.json({ error: "consent_required" }, { status: 403 });
  }

  const body = (await request.json()) as {
    images: {
      front?: string;
      back?: string;
      side?: string;
    };
  };

  if (!body?.images || !Object.values(body.images).some(Boolean)) {
    return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
  }

  const imageContent: Anthropic.MessageParam["content"] = [];

  const labels: Record<string, string> = {
    front: "Vista Frontal",
    back: "Vista Posterior",
    side: "Vista Lateral",
  };

  for (const key of ["front", "back", "side"] as const) {
    const base64 = body.images[key];
    if (!base64) continue;
    imageContent.push({
      type: "text",
      text: `[${labels[key]}]`,
    });
    imageContent.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: base64 },
    });
  }

  imageContent.push({
    type: "text",
    text: "Analise estas imagens corporais e retorne o JSON de avaliação física.",
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: imageContent }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  let result: BodyScanPayload;
  try {
    result = JSON.parse(text.replace(/```json|```/g, "").trim()) as BodyScanPayload;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }

  if (!result?.metrics) {
    return NextResponse.json({ error: "Invalid AI response structure" }, { status: 502 });
  }

  return NextResponse.json(result);
}
