import Anthropic from "@anthropic-ai/sdk";
import { createBodyScanService, createHealthService } from "@elevapro/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

/**
 * O que o modelo devolve.
 *
 * `height` e `weight` **não** estão aqui: peso é massa e nenhuma câmera mede
 * massa; altura exige referência de escala no enquadramento. Os dois entram
 * como parâmetro e a rota os recoloca na resposta final — ver `ADR-010`.
 */
interface ModelPayload {
  metrics: {
    bodyFat: number;
    muscleMass: number;
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

/** A resposta ao app: o que o modelo estimou mais a régua que veio de fora. */
interface BodyScanPayload extends ModelPayload {
  metrics: ModelPayload["metrics"] & {
    height: number;
    weight: number;
    bmi: number;
  };
  /** De onde vieram altura e peso. A tela precisa poder dizer isso ao aluno. */
  scaleSource: "assessment" | "informed";
  /** Falso quando a análise deu certo mas a gravação falhou — estados distintos. */
  persisted?: boolean;
}

/** Última avaliação física com altura registrada — a régua da imagem. */
async function loadScale(
  client: SupabaseClient,
  studentId: string,
): Promise<{ heightCm: number; weightKg: number | null } | null> {
  const { data, error } = await client
    .from("physical_assessments")
    .select("height_cm, weight_kg")
    .eq("student_id", studentId)
    .not("height_cm", "is", null)
    .order("assessed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Erro não é ausência: engolir aqui faria "falhou a consulta" virar "não tem
  // avaliação", e o aluno digitaria de novo um dado que já existe.
  if (error) throw error;
  if (!data?.height_cm) return null;

  return {
    heightCm: Number(data.height_cm),
    weightKg: data.weight_kg === null ? null : Number(data.weight_kg),
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

/**
 * Monta o prompt com a altura real como escala.
 *
 * A altura é a régua: sabendo que o corpo mede N cm e quantos pixels ele ocupa,
 * qualquer largura na imagem converte para centímetro. Sem ela o modelo só
 * poderia chutar — que é o que a versão anterior deste prompt mandava fazer.
 */
function buildSystemPrompt(heightCm: number, weightKg: number | null): string {
  const peso = weightKg === null ? "não informado" : `${weightKg} kg`;

  return `Você é um especialista em avaliação física e análise postural.

MEDIDAS CONHECIDAS DO ALUNO (não estime nenhuma delas):
- Altura: ${heightCm} cm
- Peso: ${peso}

Use a altura como escala da imagem: o corpo inteiro, da cabeça aos pés, mede ${heightCm} cm. Converta as larguras que você observa para centímetro a partir dessa proporção.

As circunferências que você devolver são ESTIMATIVAS derivadas dessa escala, não medições. Prefira errar para o conservador a inventar precisão.

Retorne APENAS JSON válido com esta estrutura exata:
{
  "metrics": { "bodyFat": number (%), "muscleMass": number (kg) },
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

Nunca retorne "height" nem "weight" — eles já são conhecidos. Nunca retorne texto fora do JSON.`;
}

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
    /** Digitados pelo aluno quando ainda não há avaliação física. */
    heightCm?: number;
    weightKg?: number;
    /** Como a foto foi enquadrada — base para comparar escaneamentos. */
    framing?: {
      markTop: number;
      markBottom: number;
      pitch: number;
      roll: number;
      levelSensor: boolean;
      camera: "front" | "back";
    };
  };

  if (!body?.images || !Object.values(body.images).some(Boolean)) {
    return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
  }

  // A avaliação física vence o que veio no corpo: é medida com fita, não
  // digitada de memória.
  let scale: { heightCm: number; weightKg: number | null } | null;
  try {
    scale = await loadScale(auth.client, auth.userId);
  } catch {
    return NextResponse.json({ error: "scale_lookup_failed" }, { status: 503 });
  }

  let scaleSource: BodyScanPayload["scaleSource"] = "assessment";

  if (!scale && typeof body.heightCm === "number") {
    scale = { heightCm: body.heightCm, weightKg: body.weightKg ?? null };
    scaleSource = "informed";
  }

  // Sem altura não há régua, e sem régua o modelo voltaria a chutar. Recusar é
  // a única saída honesta — a tela pede o dado em vez de mostrar um número
  // inventado.
  if (!scale) {
    return NextResponse.json({ error: "height_required" }, { status: 422 });
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

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      // O JSON pedido tem 2 métricas, 8 segmentos, 3 notas, 3 arrays de
      // feedback com título, risco e texto, e as recomendações. Com 1024 isso
      // ficava na fronteira e passava dela sempre que o modelo escrevia um
      // pouco mais — e a resposta cortada virava "502 falha ao interpretar",
      // indistinguível de o modelo ter errado.
      max_tokens: 4096,
      system: buildSystemPrompt(scale.heightCm, scale.weightKg),
      messages: [{ role: "user", content: imageContent }],
    });
  } catch (error) {
    console.error("[body-scan] chamada ao modelo falhou", error);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  // Truncada não é inválida: uma diz "peça de novo", a outra diz "o modelo
  // errou". Somadas no mesmo 502, ninguém sabia qual era.
  if (response.stop_reason === "max_tokens") {
    return NextResponse.json({ error: "response_truncated" }, { status: 502 });
  }

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";

  let modelResult: ModelPayload;
  try {
    modelResult = JSON.parse(text.replace(/```json|```/g, "").trim()) as ModelPayload;
  } catch {
    return NextResponse.json({ error: "invalid_ai_response" }, { status: 502 });
  }

  if (!modelResult?.metrics) {
    return NextResponse.json({ error: "invalid_ai_response" }, { status: 502 });
  }

  // O IMC é calculado aqui, sobre a altura e o peso reais. Antes vinha do
  // modelo, calculado sobre dois valores que ele mesmo tinha inventado.
  const heightM = scale.heightCm / 100;
  const bmi =
    scale.weightKg === null ? 0 : Number((scale.weightKg / (heightM * heightM)).toFixed(1));

  const result: BodyScanPayload = {
    ...modelResult,
    metrics: {
      ...modelResult.metrics,
      height: scale.heightCm,
      weight: scale.weightKg ?? 0,
      bmi,
    },
    scaleSource,
  };

  // Gravar é o que dá sentido à feature: sem histórico não existe delta, e o
  // delta é onde está o valor. O `student_id` vem do token, nunca do corpo.
  // A imagem não é gravada — só o derivado (ADR-010).
  const segments = modelResult.segments ?? {};
  try {
    await createBodyScanService(auth.client).save(auth.userId, {
      height_cm: scale.heightCm,
      weight_kg: scale.weightKg,
      body_fat_pct: modelResult.metrics.bodyFat ?? null,
      muscle_mass_kg: modelResult.metrics.muscleMass ?? null,
      bmi: scale.weightKg === null ? null : bmi,
      circ_chest: segments.chest ?? null,
      circ_waist: segments.waist ?? null,
      circ_hips: segments.hips ?? null,
      circ_arms: segments.arms ?? null,
      circ_thighs: segments.thighs ?? null,
      circ_calves: segments.calves ?? null,
      circ_neck: segments.neck ?? null,
      circ_shoulders: segments.shoulders ?? null,
      posture_symmetry_score: modelResult.postureAnalysis?.scores?.symmetry ?? null,
      posture_muscle_score: modelResult.postureAnalysis?.scores?.muscle ?? null,
      posture_overall_score: modelResult.postureAnalysis?.scores?.posture ?? null,
      posture_feedback: modelResult.postureAnalysis?.feedback ?? null,
      recommendations: modelResult.postureAnalysis?.recommendations ?? null,
      // Null quando o app não mandou: captura de versão antiga não vira
      // "enquadramento zerado", que pareceria uma medição válida.
      framing_mark_top: body.framing?.markTop ?? null,
      framing_mark_bottom: body.framing?.markBottom ?? null,
      framing_pitch: body.framing?.pitch ?? null,
      framing_roll: body.framing?.roll ?? null,
      framing_level_sensor: body.framing?.levelSensor ?? null,
      framing_camera: body.framing?.camera ?? null,
    });
  } catch (error) {
    // Falha de gravação não pode virar falha da análise: a foto já foi enviada
    // e o aluno já pagou a espera. Mas também não some — devolvemos o
    // resultado marcado como não persistido, para a tela poder avisar.
    console.error("[body-scan] falha ao gravar em body_scans", error);
    return NextResponse.json({ ...result, persisted: false });
  }

  return NextResponse.json({ ...result, persisted: true });
}
