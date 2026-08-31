import Anthropic from "@anthropic-ai/sdk";
import {
  createBodyScanService,
  createHealthService,
  type EtapaDaAnalise,
  etapaDoTexto,
  type LinhaDoFluxo,
  linhaDoFluxo,
  type MedidasGeometricas,
  type VereditosDaCaptura,
} from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { authorizeStudent } from "@/lib/api-auth";
import { clienteDoTitular } from "@/lib/supabase-titular";
import { carregarContextoDoScan } from "@/modules/ai/services/contextoDoScan";
import { type FonteDaEscala, resolverEscala } from "@/modules/ai/services/escala";
import {
  descreverFatosMedidos,
  type MedidasPorPose,
  medidasParaOScan,
} from "@/modules/ai/services/fatosMedidos";

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
 * como parâmetro e a rota os recoloca na resposta final — ver `ADR-0010`.
 */
interface ModelPayload {
  metrics: {
    bodyFat: number;
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

/** A resposta ao app: o que o modelo estimou mais a Escala que veio de fora. */
interface BodyScanPayload extends ModelPayload {
  metrics: ModelPayload["metrics"] & {
    height: number;
    weight: number;
    /** Derivada de `peso × (1 − gordura)`. Null quando a gordura não saiu. */
    leanMass: number | null;
    bmi: number;
  };
  /** De onde vieram altura e peso. A tela precisa poder dizer isso ao aluno. */
  scaleSource: FonteDaEscala;
  /** O que o aparelho mediu, em cm e grau. É o que a tela mostra ao aluno. */
  measured: MedidasGeometricas;
  /** O que o portão concluiu sobre a captura. Alimenta o selo de confiança. */
  quality: VereditosDaCaptura;
  /** Falso quando a análise deu certo mas a gravação falhou — estados distintos. */
  persisted?: boolean;
}

/**
 * O que pode ir para o log de uma falha desta rota.
 *
 * Diagnóstico sem carga: nenhum caminho de erro daqui pode carregar valor
 * medido, e o objeto de erro do Postgrest carrega — `details` ecoa a linha
 * recusada, que aqui é o fact sheet inteiro.
 */
function motivoDaFalha(error: unknown): { code?: string; message: string } {
  if (typeof error === "object" && error !== null && "code" in error) {
    const erro = error as { code?: unknown; message?: unknown };

    return {
      code: typeof erro.code === "string" ? erro.code : undefined,
      message: typeof erro.message === "string" ? erro.message : "erro sem mensagem",
    };
  }

  return { message: error instanceof Error ? error.message : "erro desconhecido" };
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(
  heightCm: number,
  weightKg: number | null,
  fatosMedidos: string | null,
  contexto: string | null,
): string {
  const peso = weightKg === null ? "não informado" : `${weightKg} kg`;

  // Sem fatos medidos o prompt volta a pedir a proporção — é o caminho de quando
  // o aparelho não conseguiu medir, e a análise degrada em vez de falhar.
  const escala =
    fatosMedidos ??
    `Use a altura como escala da imagem: o corpo inteiro, da cabeça aos pés, mede ${heightCm} cm. Converta as larguras que você observa para centímetro a partir dessa proporção.`;

  return `Você é um especialista em avaliação física e análise postural.

MEDIDAS CONHECIDAS DO ALUNO (não estime nenhuma delas):
- Altura: ${heightCm} cm
- Peso: ${peso}

${escala}

As circunferências que você devolver são ESTIMATIVAS, não medições. Prefira errar para o conservador a inventar precisão.

${
  contexto
    ? `${contexto}
`
    : ""
}
COMO ESCREVER:
- Relate o que a imagem e as medidas mostram. Nada de elogio, encorajamento ou consolo.
- Não suavize achado para poupar o aluno, e não invente achado para parecer útil.
- Corpo sem alteração relevante recebe "nada a apontar", não um parágrafo elogioso.
- Sem julgamento estético: o texto descreve postura e proporção, nunca aparência.
- Escreva para quem vai agir sobre o corpo, não para quem quer se sentir bem.

Retorne APENAS JSON válido com esta estrutura exata:
{
  "metrics": { "bodyFat": number (%) },
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
  const auth = await authorizeStudent(request);
  if (!auth.ok) return auth.response;

  const client = clienteDoTitular(request);
  const userId = auth.caller.id;

  // Antes de ler o corpo da requisição, de propósito: sem consentimento a
  // imagem não deve nem ser desserializada aqui, muito menos sair para os EUA.
  // Pendência da seção 10 do LGPD_COMPLIANCE — Art. 11, I.
  let hasConsent: boolean;
  try {
    hasConsent = await createHealthService(client).hasCollectionConsent(userId);
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
    /** Como a foto foi enquadrada — base para comparar escaneamentos. */
    framing?: {
      markTop: number;
      markBottom: number;
      pitch: number;
      roll: number;
      levelSensor: boolean;
      camera: "front" | "back";
    };
    /**
     * O que o portão viu na captura, já decidido no aparelho.
     *
     * Veredito, nunca o histograma: o especialista precisa saber se pondera o
     * número, não reprocessar uma foto que não existe mais.
     */
    qualidade?: {
      backlit: boolean;
      lowLight: boolean;
      blownOut: boolean;
      /** false quando o aluno usou a saída manual sem confirmar o encaixe. */
      framingConfirmed: boolean;
    };
    /**
     * O que o aparelho mediu em cada foto, em pixels e graus.
     *
     * Chega em pixel porque o aparelho não conhece a altura — a conversão para
     * centímetro é feita aqui, onde a Escala já foi resolvida (`ADR-0022`).
     */
    medidas?: MedidasPorPose;
  };

  if (!body?.images || !Object.values(body.images).some(Boolean)) {
    return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
  }

  // A mesma função que o portão de elegibilidade usa. Com a precedência escrita
  // em dois lugares, o portão libera e esta rota recusa — que é exatamente o
  // beco que a issue fecha, com outro nome.
  const [avaliacaoRes, anamneseRes] = await Promise.all([
    client
      .from("physical_assessments")
      .select("height_cm, weight_kg")
      .eq("student_id", userId)
      .order("assessed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Os dois campos extraídos no banco: `responses` inteiro traria lesão e
    // medicação junto, para ler altura (Art. 6º, III).
    client
      .from("student_anamnesis")
      .select("responses->height, responses->weight")
      .eq("student_id", userId)
      .maybeSingle(),
  ]);

  // Erro não é ausência: engolir aqui faria "falhou a consulta" virar "não tem
  // avaliação", e o aluno seria mandado preencher o que já preencheu.
  if (avaliacaoRes.error || anamneseRes.error) {
    return NextResponse.json({ error: "scale_lookup_failed" }, { status: 503 });
  }

  const escala = resolverEscala({
    avaliacao: avaliacaoRes.data
      ? {
          height_cm: Number(avaliacaoRes.data.height_cm),
          weight_kg: Number(avaliacaoRes.data.weight_kg),
        }
      : null,
    anamnese: anamneseRes.data as Record<string, unknown> | null,
  });

  // Sem Escala o modelo voltaria a chutar. Recusar é a única saída honesta — e
  // o portão da entrada já deveria ter evitado o aluno chegar até aqui.
  if (!escala.ok) {
    return NextResponse.json({ error: "height_required", motivo: escala.motivo }, { status: 422 });
  }

  const scale = { heightCm: escala.heightCm, weightKg: escala.weightKg };
  const scaleSource = escala.fonte;

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

  // Contexto é enriquecimento: se falhar, a análise sai sem ele em vez de não
  // sair. O aluno perde a comparação, não o laudo.
  const contexto = await carregarContextoDoScan(client, userId, new Date()).catch(() => null);

  const parametros = {
    model: "claude-sonnet-4-6",
    // O JSON pedido tem 2 métricas, 8 segmentos, 3 notas, 3 arrays de
    // feedback com título, risco e texto, e as recomendações. Com 1024 isso
    // ficava na fronteira e passava dela sempre que o modelo escrevia um
    // pouco mais — e a resposta cortada virava "502 falha ao interpretar",
    // indistinguível de o modelo ter errado.
    max_tokens: 4096,
    // Zero, e não o padrão 1.0. A mesma foto enviada duas vezes devolvia
    // cintura diferente, e o ADR-0010 apoia a confiabilidade do delta em erro
    // sistemático que se cancela — amostragem aleatória não cancela. Reduz
    // muito a variação; não elimina.
    temperature: 0,
    system: buildSystemPrompt(
      scale.heightCm,
      scale.weightKg,
      descreverFatosMedidos(body.medidas ?? {}, scale.heightCm),
      contexto,
    ),
    messages: [{ role: "user", content: imageContent }],
  } satisfies Anthropic.MessageCreateParamsNonStreaming;

  /**
   * O que acontece depois de o modelo terminar: derivar, gravar e montar o
   * resultado.
   *
   * Closure e não função de topo porque depende de sete coisas já resolvidas
   * aqui — Escala, fonte da Escala, medidas, vereditos, corpo do pedido,
   * cliente e titular. Passar todas por parâmetro seria uma assinatura que
   * ninguém lê para esconder que o trabalho é o mesmo.
   */
  const finalizar = async (modelResult: ModelPayload) => {
    // O IMC é calculado aqui, sobre a altura e o peso reais. Antes vinha do
    // modelo, calculado sobre dois valores que ele mesmo tinha inventado.
    const heightM = scale.heightCm / 100;
    const bmi = Number((scale.weightKg / (heightM * heightM)).toFixed(1));

    // Massa magra deixa de ser número livre do modelo e vira conta explícita
    // sobre o peso conhecido e a gordura estimada. É por isso que a coluna deixou
    // de se chamar `muscle_mass_kg`: esta conta inclui osso, órgão e água, e
    // nenhum dos dois lados dela discrimina tecido (`ADR-0022`).
    const gordura = modelResult.metrics.bodyFat;
    const leanMassKg =
      typeof gordura === "number"
        ? Number((scale.weightKg * (1 - gordura / 100)).toFixed(1))
        : null;

    // O aluno tem direito de acesso ao que foi tratado sobre o corpo dele
    // (Art. 18, II), e medida que só o especialista lê é tratamento sem livre
    // acesso. A mesma conta alimenta a coluna e a tela.
    const medidas = medidasParaOScan(body.medidas ?? {}, scale.heightCm);

    // Os mesmos vereditos que vão para as colunas voltam para a tela: o aluno
    // precisa saber o quanto confiar no número que está lendo, e essa informação
    // existia só para o especialista.
    const vereditos: VereditosDaCaptura = {
      quality_backlit: body.qualidade?.backlit ?? null,
      quality_low_light: body.qualidade?.lowLight ?? null,
      quality_blown_out: body.qualidade?.blownOut ?? null,
      framing_confirmed: body.qualidade?.framingConfirmed ?? null,
    };

    const result: BodyScanPayload = {
      ...modelResult,
      metrics: {
        ...modelResult.metrics,
        height: scale.heightCm,
        weight: scale.weightKg,
        leanMass: leanMassKg,
        bmi,
      },
      scaleSource,
      measured: medidas,
      quality: vereditos,
    };

    // Gravar é o que dá sentido à feature: sem histórico não existe delta, e o
    // delta é onde está o valor. O `student_id` vem do token, nunca do corpo.
    // A imagem não é gravada — só o derivado (ADR-0010).
    const segments = modelResult.segments ?? {};
    try {
      await createBodyScanService(client).save(userId, {
        height_cm: scale.heightCm,
        weight_kg: scale.weightKg,
        scale_source: scaleSource,
        body_fat_pct: modelResult.metrics.bodyFat ?? null,
        lean_mass_kg: leanMassKg,
        bmi,
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
        // As medidas do aparelho, convertidas pela mesma conta que escreveu o
        // prompt. Null onde a máscara não mediu — nunca zero, que pareceria uma
        // medição válida de um corpo sem desnível.
        ...medidas,
        ...vereditos,
      });
    } catch (error) {
      // Falha de gravação não pode virar falha da análise: a foto já foi enviada
      // e o aluno já pagou a espera. Mas também não some — devolvemos o
      // resultado marcado como não persistido, para a tela poder avisar.
      // Só código e mensagem: `details` de violação de constraint ecoa a linha
      // que falhou, e a linha inteira é o fact sheet — "desnível de ombro de
      // 1,8 cm" num log é inferência sobre saúde de titular identificado
      // (Art. 6°, VIII). Quem conserta precisa de qual constraint, não de quanto.
      console.error("[body-scan] falha ao gravar em body_scans", motivoDaFalha(error));
      return { ...result, persisted: false };
    }

    return { ...result, persisted: true };
  };

  // Daqui em diante a resposta é um fluxo NDJSON, e não mais um JSON único.
  //
  // A geração leva ~30s, e trinta segundos de tela parada são indistinguíveis
  // de travado. As linhas de etapa carregam a seção que o modelo ACABOU de
  // emitir — se ele parar, a etapa para junto, que é a informação que faltava.
  //
  // Erro depois daqui viaja DENTRO do fluxo, com status 200: o cabeçalho já
  // foi enviado e não há como voltar atrás. Tudo que acontece antes continua
  // respondendo por código HTTP, como sempre respondeu.
  const fluxo = new ReadableStream({
    async start(controller) {
      const codificador = new TextEncoder();
      const emitir = (linha: LinhaDoFluxo) =>
        controller.enqueue(codificador.encode(linhaDoFluxo(linha)));

      try {
        emitir({ t: "etapa", etapa: "lendo" });

        const conversa = anthropic.messages.stream(parametros);
        let acumulado = "";
        let etapa: EtapaDaAnalise = "lendo";

        for await (const evento of conversa) {
          if (evento.type !== "content_block_delta" || evento.delta.type !== "text_delta") {
            continue;
          }

          acumulado += evento.delta.text;
          const atual = etapaDoTexto(acumulado);
          if (atual !== etapa) {
            etapa = atual;
            emitir({ t: "etapa", etapa });
          }
        }

        const resposta = await conversa.finalMessage();

        // Truncada não é inválida: uma diz "peça de novo", a outra diz "o
        // modelo errou". Somadas no mesmo código, ninguém sabia qual era.
        if (resposta.stop_reason === "max_tokens") {
          emitir({ t: "erro", codigo: "response_truncated" });
          return;
        }

        const bruto = resposta.content[0]?.type === "text" ? resposta.content[0].text : "";

        let modelResult: ModelPayload;
        try {
          modelResult = JSON.parse(bruto.replace(/```json|```/g, "").trim()) as ModelPayload;
        } catch {
          emitir({ t: "erro", codigo: "invalid_ai_response" });
          return;
        }

        if (!modelResult?.metrics) {
          emitir({ t: "erro", codigo: "invalid_ai_response" });
          return;
        }

        emitir({ t: "ok", payload: await finalizar(modelResult) });
      } catch (error) {
        console.error("[body-scan] chamada ao modelo falhou", motivoDaFalha(error));
        emitir({ t: "erro", codigo: "ai_unavailable" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(fluxo, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Sem isto um proxy pode segurar o fluxo inteiro e entregar tudo no fim —
      // que é exatamente a tela parada que este trabalho existe para remover.
      "X-Accel-Buffering": "no",
    },
  });
}
