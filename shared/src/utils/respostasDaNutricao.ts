import type {
  AnaliseDoPrato,
  ComponenteDoPrato,
  ItemSugerido,
  SugestaoDeRefeicao,
  SugestaoDoAssistente,
} from "../types/respostasDaNutricao.types";

type Registro = Record<string, unknown>;

/** O modelo costuma embrulhar JSON em cerca de markdown. */
function jsonDoModelo(texto: string): unknown {
  try {
    return JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

function ehRegistro(valor: unknown): valor is Registro {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Número finito e não negativo, aceitando número escrito como texto. */
function medida(valor: unknown): number | null {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  return typeof numero === "number" && Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

/** Todos os campos numéricos pedidos, ou `null` se algum faltar. */
function medidas<K extends string>(
  bruto: Registro,
  campos: readonly K[],
): Record<K, number> | null {
  const lidas = campos.map((campo) => [campo, medida(bruto[campo])] as const);
  if (lidas.some(([, valor]) => valor === null)) return null;
  return Object.fromEntries(lidas) as Record<K, number>;
}

const MACROS = ["calories", "protein", "carbs", "fat"] as const;

function componente(bruto: unknown): ComponenteDoPrato | null {
  if (!ehRegistro(bruto)) return null;
  const name = texto(bruto.name);
  const numeros = medidas(bruto, [...MACROS, "grams"] as const);
  return name && numeros ? { name, ...numeros } : null;
}

/**
 * A resposta do scan, validada. Componente incompleto sai da lista; sem nome ou
 * sem os macros do prato, não há análise.
 *
 * @example lerAnaliseDoPrato(textoDoModelo)?.components
 */
export function lerAnaliseDoPrato(textoDoModelo: string): AnaliseDoPrato | null {
  const bruto = jsonDoModelo(textoDoModelo);
  if (!ehRegistro(bruto)) return null;
  const name = texto(bruto.name);
  const macros = medidas(bruto, MACROS);
  if (!name || !macros) return null;
  const componentes = Array.isArray(bruto.components) ? bruto.components : [];
  return {
    name,
    ...macros,
    confidence: Math.min(1, medida(bruto.confidence) ?? 0),
    components: componentes.map(componente).filter((c): c is ComponenteDoPrato => c !== null),
  };
}

const CAMPOS_DO_ITEM = ["gramas", "calorias", "proteina", "carboidrato", "gordura"] as const;

function itemSugerido(bruto: unknown): ItemSugerido | null {
  if (!ehRegistro(bruto)) return null;
  const nome = texto(bruto.nome);
  const numeros = medidas(bruto, CAMPOS_DO_ITEM);
  return nome && numeros ? { nome, ...numeros } : null;
}

function sugestaoDoAssistente(bruto: unknown): SugestaoDoAssistente | null {
  if (!ehRegistro(bruto) || !Array.isArray(bruto.itens)) return null;
  const refeicao = texto(bruto.refeicao);
  const itens = bruto.itens.map(itemSugerido).filter((i): i is ItemSugerido => i !== null);
  return refeicao && itens.length > 0 ? { refeicao, itens } : null;
}

const BLOCO_DE_SUGESTAO = /<sugestao>([\s\S]*?)<\/sugestao>/;

/**
 * Tira da resposta do assistente o bloco `<sugestao>{…}</sugestao>` e o valida.
 *
 * O bloco sai do texto mesmo quebrado: o aluno não pode ler JSON cru no balão.
 *
 * @example const { resposta, sugestao } = separarSugestaoDaResposta(textoDoModelo);
 */
export function separarSugestaoDaResposta(textoDoModelo: string): {
  resposta: string;
  sugestao: SugestaoDoAssistente | null;
} {
  const achado = textoDoModelo.match(BLOCO_DE_SUGESTAO);
  if (!achado) return { resposta: textoDoModelo.trim(), sugestao: null };
  return {
    resposta: textoDoModelo.replace(BLOCO_DE_SUGESTAO, "").trim(),
    sugestao: sugestaoDoAssistente(jsonDoModelo(achado[1])),
  };
}

/** A tela da busca desenha dois cartões. */
const SUGESTOES_NA_BUSCA = 2;

function sugestaoDeRefeicao(bruto: unknown): SugestaoDeRefeicao | null {
  if (!ehRegistro(bruto)) return null;
  const nome = texto(bruto.nome);
  const destaque = texto(bruto.destaque);
  const numeros = medidas(bruto, ["calorias", "minutos"] as const);
  return nome && destaque && numeros ? { nome, destaque, ...numeros } : null;
}

/**
 * As sugestões da busca, validadas, no máximo duas. Ilegível dá lista vazia.
 *
 * @example lerSugestoesDeRefeicao(textoDoModelo).length
 */
export function lerSugestoesDeRefeicao(textoDoModelo: string): SugestaoDeRefeicao[] {
  const bruto = jsonDoModelo(textoDoModelo);
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map(sugestaoDeRefeicao)
    .filter((s): s is SugestaoDeRefeicao => s !== null)
    .slice(0, SUGESTOES_NA_BUSCA);
}

/**
 * O total estimado da lista em reais, ou `null` — zero não é estimativa.
 *
 * @example lerPrecoEstimado('{"total": 284.5}') // 284.5
 */
export function lerPrecoEstimado(textoDoModelo: string): number | null {
  const bruto = jsonDoModelo(textoDoModelo);
  if (!ehRegistro(bruto)) return null;
  const total = medida(bruto.total);
  return total && total > 0 ? total : null;
}
