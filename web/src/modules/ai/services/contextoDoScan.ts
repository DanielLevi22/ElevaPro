import { achatarRespostas, type BodyScanRecord, createBodyScanService } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O que a análise precisa saber além das fotos.
 *
 * A rota do Body scan era cega de contexto: via três imagens e uma altura, e
 * mais nada. Isso deixava de fora as duas informações que mais mudam o laudo:
 *
 * - **O scan anterior.** O `ADR-0010` diz que "o valor está na diferença entre
 *   dois scans, não no número absoluto de um só" — e o modelo nunca via essa
 *   diferença. Ele descrevia um retrato onde o produto promete um filme.
 * - **A limitação física do aluno.** Recomendação postural para quem tem
 *   manguito operado deveria ser outra, e era a mesma.
 *
 * A anamnese entra por **campo nomeado, nunca inteira**. É o mesmo recorte que
 * o briefing usa: lê o que a finalidade exige e não o resto (Art. 6º, III).
 */

/** Os campos da anamnese que mudam uma leitura postural. Só estes. */
const CAMPOS_RELEVANTES = [
  ["injuries", "lesões"],
  ["health_injuries", "lesões"],
  ["other_injuries", "outras lesões"],
  ["surgeries", "cirurgias"],
  ["mobility_limitations", "limitações de mobilidade"],
  ["current_pain", "dor atual"],
] as const;

/** Campos comparáveis entre dois scans, e como chamá-los no texto. */
const COMPARAVEIS = [
  ["circ_waist", "cintura"],
  ["circ_hips", "quadril"],
  ["circ_chest", "peito"],
  ["circ_arms", "braço"],
  ["circ_thighs", "coxa"],
  ["body_fat_pct", "gordura corporal"],
] as const;

export interface EntradaDoContexto {
  /** O scan mais recente antes deste, ou `null` se é o primeiro. */
  anterior: BodyScanRecord | null;
  /** Respostas da anamnese já achatadas, ou `null` quando não há. */
  anamnese: Record<string, unknown> | null;
  /** Objetivo do plano ativo, quando existe. */
  objetivo: string | null;
  /** Quando este scan está sendo feito. Injetado para o texto ser testável. */
  agora: Date;
}

const texto = (valor: unknown): string | null => {
  if (typeof valor === "string" && valor.trim().length > 0) return valor.trim();
  if (Array.isArray(valor) && valor.length > 0) return valor.join(", ");

  return null;
};

function diasEntre(inicio: string, fim: Date): number {
  const dia = 1000 * 60 * 60 * 24;

  return Math.max(0, Math.round((fim.getTime() - new Date(inicio).getTime()) / dia));
}

/**
 * Os números do scan anterior, para a análise falar de diferença.
 *
 * Vão como valores do passado, não como alvo: quem interpreta a variação é o
 * modelo, e dizer para onde ela deveria ir seria induzir o achado.
 */
function descreverAnterior(anterior: BodyScanRecord, agora: Date): string[] {
  const linhas = COMPARAVEIS.map(([campo, nome]) => {
    const valor = anterior[campo];

    return valor === null ? null : `  - ${nome}: ${valor}`;
  }).filter((linha): linha is string => linha !== null);

  if (linhas.length === 0) return [];

  return [
    `- Análise anterior, há ${diasEntre(anterior.scanned_at, agora)} dias:`,
    ...linhas,
    "  Compare com o que você medir agora e diga o que mudou. A diferença é o",
    "  número confiável; o valor isolado de um scan é estimativa.",
  ];
}

function descreverLimitacoes(anamnese: Record<string, unknown>): string[] {
  const achados = CAMPOS_RELEVANTES.map(([campo, nome]) => {
    const valor = texto(anamnese[campo]);

    return valor === null ? null : `  - ${nome}: ${valor}`;
  }).filter((linha): linha is string => linha !== null);

  if (achados.length === 0) return [];

  return [
    "- Histórico relatado pelo aluno na anamnese:",
    ...achados,
    "  Leve isto em conta na recomendação. Não diagnostique a partir disto, e não",
    "  atribua um achado postural à lesão sem que a imagem sustente.",
  ];
}

/**
 * O bloco de contexto, pronto para o prompt. `null` quando não há nada a dizer.
 *
 * @example
 * const bloco = descreverContextoDoScan({ anterior, anamnese, objetivo, agora: new Date() });
 */
export function descreverContextoDoScan(entrada: EntradaDoContexto): string | null {
  const partes: string[] = [];

  if (entrada.anterior) partes.push(...descreverAnterior(entrada.anterior, entrada.agora));
  if (entrada.anamnese) partes.push(...descreverLimitacoes(entrada.anamnese));
  if (entrada.objetivo) partes.push(`- Objetivo do plano atual: ${entrada.objetivo}`);

  if (partes.length === 0) return null;

  return ["CONTEXTO DESTE ALUNO:", "", ...partes].join("\n");
}

/**
 * Carrega o contexto e já devolve o bloco do prompt.
 *
 * Lê com o cliente do titular, não com o admin: a RLS é quem garante que
 * ninguém puxe o histórico de outro aluno, e passar por cima dela aqui trocaria
 * uma garantia do banco por uma verificação de código.
 *
 * O recorte da anamnese acontece no **`select`**, não depois: pedir `responses`
 * inteiro para filtrar em memória traria medicação e histórico familiar até a
 * borda do processo por nada (Art. 6º, III). É a mesma disciplina que a leitura
 * de altura desta rota já usa.
 */
export async function carregarContextoDoScan(
  client: SupabaseClient,
  studentId: string,
  agora: Date,
): Promise<string | null> {
  const [anterior, anamneseRes, planoRes] = await Promise.all([
    createBodyScanService(client).list(studentId, 1),
    // A lista vai literal, repetindo `CAMPOS_RELEVANTES` acima. É duplicação
    // deliberada: `check-column-refs` só enxerga `.select("...")` escrito na
    // chamada — string montada em runtime, ou até constante nomeada, deixa a
    // consulta fora da verificação de coluna inexistente. Numa consulta sobre
    // dado de saúde, perder essa guarda custa mais que repetir seis nomes.
    // Campo novo entra nos dois lugares.
    client
      .from("student_anamnesis")
      .select(
        "responses->injuries, responses->health_injuries, responses->other_injuries, responses->surgeries, responses->mobility_limitations, responses->current_pain",
      )
      .eq("student_id", studentId)
      .maybeSingle(),
    client
      .from("training_periodizations")
      .select("objective")
      .eq("student_id", studentId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  // Contexto ausente e contexto que falhou de carregar dão no mesmo bloco: o
  // laudo sai sem a comparação, e é o chamador que decide se isso o impede.
  return descreverContextoDoScan({
    anterior: anterior[0] ?? null,
    anamnese: achatarRespostas(anamneseRes.data as Record<string, unknown> | null),
    objetivo: (planoRes.data as { objective: string | null } | null)?.objective ?? null,
    agora,
  });
}
