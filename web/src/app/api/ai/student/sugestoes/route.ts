import { lerSugestoesDeRefeicao } from "@elevapro/shared";
import { type NextRequest, NextResponse } from "next/server";
import { withAiRoute } from "@/lib/ai-route";
import { authorizeStudentWithHealthConsent } from "@/lib/api-auth";
import { aiProviders } from "@/modules/ai/ai.config";
import { responderEmUmTurno } from "@/modules/ai/providers/turnoUnico";

// Na Vercel uma rota sem isto morre no default de poucos segundos; 60s é o
// máximo do plano Hobby.
export const maxDuration = 60;

const MACROS = ["calorias", "proteina", "carboidrato", "gordura"] as const;
type Faltam = Record<(typeof MACROS)[number], number>;

/** Favoritas além disso não mudam a sugestão, e só alongam o que sai. */
const MAXIMO_DE_FAVORITAS = 5;
const TAMANHO_DO_NOME = 60;

const SYSTEM_PROMPT = `Você sugere refeições rápidas a um aluno com plano alimentar. Responda em Português do Brasil.
Retorne APENAS JSON válido, uma lista com exatamente 2 itens:
[{"nome":"refeição","calorias":número,"minutos":número de preparo,"destaque":"rótulo curto, como Alta proteína ou Low carb"}]
As sugestões cabem no que falta de calorias e priorizam a proteína que falta. Nunca retorne texto fora do JSON.`;

/** Os quatro macros como número finito não negativo, ou `null`. */
function lerFaltam(bruto: unknown): Faltam | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const registro = bruto as Record<string, unknown>;
  const valores = MACROS.map((macro) => [macro, registro[macro]] as const);
  const invalido = valores.some(
    ([, valor]) => typeof valor !== "number" || !Number.isFinite(valor) || valor < 0,
  );
  return invalido ? null : (Object.fromEntries(valores) as Faltam);
}

/** Só nomes curtos de refeição: o que o cliente mandar além disso não sai. */
function lerFavoritas(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((nome): nome is string => typeof nome === "string" && nome.trim().length > 0)
    .map((nome) => nome.trim().slice(0, TAMANHO_DO_NOME))
    .slice(0, MAXIMO_DE_FAVORITAS);
}

/** A mensagem ao provedor, montada campo a campo — nunca o corpo do pedido. */
function mensagemDoDia(faltam: Faltam, favoritas: string[]): string {
  const linhaDosMacros =
    `Faltam hoje: ${faltam.calorias} kcal, ${faltam.proteina} g de proteína, ` +
    `${faltam.carboidrato} g de carboidrato e ${faltam.gordura} g de gordura.`;
  return favoritas.length
    ? `${linhaDosMacros}\nRefeições favoritas: ${favoritas.join(", ")}.`
    : linhaDosMacros;
}

/**
 * As duas "Sugestões do assistente" da busca do aluno (issue #298).
 *
 * Ao provedor vão só os macros que faltam no dia e os nomes das refeições
 * favoritas. O aluno está identificado pelo token, e nada dele entra na
 * mensagem (LGPD, Art. 6°, III).
 */
const handler = async (request: NextRequest) => {
  const auth = await authorizeStudentWithHealthConsent(request);
  if (!auth.ok) return auth.response;

  const corpo = (await request.json()) as { faltam?: unknown; favoritas?: unknown };
  const faltam = lerFaltam(corpo.faltam);
  if (!faltam) {
    return NextResponse.json(
      { error: "faltam deve ter calorias, proteina, carboidrato e gordura como números ≥ 0" },
      { status: 400 },
    );
  }

  const { texto } = await responderEmUmTurno(aiProviders.fast, {
    systemBlocks: [{ text: SYSTEM_PROMPT }],
    messages: [{ role: "user", content: mensagemDoDia(faltam, lerFavoritas(corpo.favoritas)) }],
    tools: [],
    maxTokens: 512,
  });

  return NextResponse.json({ sugestoes: lerSugestoesDeRefeicao(texto) });
};

export const POST = withAiRoute(handler);
