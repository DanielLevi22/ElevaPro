/**
 * O protocolo do fluxo da análise corporal.
 *
 * A chamada ao modelo leva cerca de trinta segundos — medido no BFF: 30,4s e
 * 31,4s, com quase tudo dentro da geração. Trinta segundos de tela parada são
 * indistinguíveis de travado, e o aluno fecha o app achando que quebrou.
 *
 * A resposta deixa de ser um JSON único e passa a ser NDJSON: uma linha por
 * evento, a última carregando o resultado. O que o fluxo carrega são **etapas
 * reais** — a seção que o modelo acabou de emitir —, nunca uma barra de
 * progresso inventada. É a mesma regra que tirou o "Athletic Score" e a espera
 * fabricada da tela: nada aqui pode fingir saber o que não sabe.
 *
 * Não deixa mais rápido. Deixa visível, que é o problema de verdade.
 */

/** Onde o modelo está, lido do que ele já escreveu. */
export type EtapaDaAnalise = "lendo" | "proporcoes" | "postura" | "recomendacoes";

export type LinhaDoFluxo =
  | { t: "etapa"; etapa: EtapaDaAnalise }
  /** O `payload` é o mesmo objeto que a rota devolvia antes, sem mudança. */
  | { t: "ok"; payload: unknown }
  /** Erro depois que o fluxo abriu: o status HTTP já foi enviado como 200. */
  | { t: "erro"; codigo: string };

/**
 * As marcas que o JSON pedido atravessa, da última para a primeira.
 *
 * Da última para a primeira porque a busca é por inclusão num texto que só
 * cresce: quando `recommendations` aparece, `segments` continua lá. Invertida,
 * a ordem travaria a etapa na primeira seção para sempre.
 */
const MARCAS: Array<[string, EtapaDaAnalise]> = [
  ['"recommendations"', "recomendacoes"],
  ['"postureAnalysis"', "postura"],
  ['"segments"', "proporcoes"],
];

/**
 * A etapa correspondente ao que o modelo já emitiu.
 *
 * Lê o texto acumulado, não um relógio: se a geração travar, a etapa para de
 * avançar — que é exatamente a informação que o aluno precisa ter.
 *
 * @example
 * etapaDoTexto('{"metrics":{"bodyFat":18},"segments":{') // "proporcoes"
 */
export function etapaDoTexto(texto: string): EtapaDaAnalise {
  for (const [marca, etapa] of MARCAS) {
    if (texto.includes(marca)) return etapa;
  }

  return "lendo";
}

/** Uma linha do NDJSON, com o terminador. */
export function linhaDoFluxo(linha: LinhaDoFluxo): string {
  return `${JSON.stringify(linha)}
`;
}

/**
 * Separa as linhas completas do que ainda está pela metade.
 *
 * O leitor recebe pedaços de tamanho arbitrário — uma linha pode chegar
 * cortada no meio de um caractere multibyte. Devolver o resto para o chamador
 * guardar é o que impede o `JSON.parse` de estourar num objeto incompleto.
 *
 * @example
 * separarLinhas('{"t":"etapa"}\n{"t":"o')
 * // { linhas: ['{"t":"etapa"}'], resto: '{"t":"o' }
 */
export function separarLinhas(acumulado: string): { linhas: LinhaDoFluxo[]; resto: string } {
  const partes = acumulado.split("\n");
  const resto = partes.pop() ?? "";
  const linhas: LinhaDoFluxo[] = [];

  for (const parte of partes) {
    const limpa = parte.trim();
    if (limpa.length === 0) continue;

    try {
      linhas.push(JSON.parse(limpa) as LinhaDoFluxo);
    } catch {
      // Linha ilegível não derruba o fluxo: as seguintes ainda valem, e a de
      // resultado é a que importa. Engolir aqui é preferível a perder o laudo
      // por causa de um evento de progresso corrompido.
    }
  }

  return { linhas, resto };
}
