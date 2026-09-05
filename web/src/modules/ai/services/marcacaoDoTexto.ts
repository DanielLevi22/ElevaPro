/**
 * A marcação que o assistente usa, separada em pedaços.
 *
 * O modelo escreve em markdown porque é assim que ele escreve, e a bolha
 * mostrava o texto cru: `**Aprovar**` chegava com os asteriscos, e o destaque
 * virava ruído justamente nas frases que ele quis destacar.
 *
 * Devolve pedaços, não HTML. Quem renderiza monta elementos React a partir
 * daqui, então não existe `dangerouslySetInnerHTML` no caminho e não existe
 * superfície de injeção a partir de texto que veio de um modelo — o que uma
 * biblioteca de markdown traria junto, com sanitização para acertar e manter.
 *
 * O que ela não conhece continua aparecendo como o modelo escreveu, que é o
 * comportamento de hoje.
 *
 * @example
 * pedacosDoTexto("Clique em **Aprovar**")
 * // [{ tipo: "texto", texto: "Clique em " }, { tipo: "negrito", texto: "Aprovar" }]
 */
export type TipoDoPedaco = "texto" | "negrito" | "italico" | "codigo";

export interface PedacoDeTexto {
  tipo: TipoDoPedaco;
  texto: string;
}

/**
 * Negrito antes de itálico: `**` também casa com a regra de um asterisco só, e
 * a ordem é o que impede `**Aprovar**` de virar itálico com asteriscos sobrando.
 *
 * Cada marca exige o par na mesma linha. Asterisco solto — o de uma
 * multiplicação, o de uma nota de rodapé — não tem par e continua asterisco, em
 * vez de comer o resto da frase até encontrar outro.
 */
const MARCACAO = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

function classificar(parte: string): PedacoDeTexto {
  if (parte.startsWith("**")) return { tipo: "negrito", texto: parte.slice(2, -2) };
  if (parte.startsWith("`")) return { tipo: "codigo", texto: parte.slice(1, -1) };
  if (parte.startsWith("*")) return { tipo: "italico", texto: parte.slice(1, -1) };
  return { tipo: "texto", texto: parte };
}

export function pedacosDoTexto(conteudo: string): PedacoDeTexto[] {
  return conteudo
    .split(MARCACAO)
    .filter((parte) => parte.length > 0)
    .map(classificar);
}
