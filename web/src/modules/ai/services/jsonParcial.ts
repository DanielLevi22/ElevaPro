/**
 * Lê o JSON que ainda está sendo escrito.
 *
 * A proposta de treinos chega em pedaços ao longo de 15 a 20 segundos, e
 * metade de um JSON não parseia: `{"workouts":[{"title":"Treino A","exerc` não
 * é objeto nenhum. Ou a tela espera o fim — e aí não há progresso —, ou ela
 * sabe ler o incompleto.
 *
 * A regra que torna isso confiável: **nunca completar um valor que ainda está
 * sendo escrito.** O texto é cortado no último ponto em que um membro terminou
 * de verdade, e só então o que ficou aberto é fechado. `"sets": 1` a caminho de
 * `12` some até o número acabar, em vez de virar uma série de uma repetição na
 * tela.
 *
 * Devolve `null` enquanto não dá para saber nada. Quem chama trata como
 * "ainda não".
 *
 * @example
 * lerJsonParcial('{"workouts":[{"title":"Treino A","exerc')
 * // { workouts: [{ title: "Treino A" }] }
 */
type Container = "obj" | "arr";

interface Leitura {
  /** O que continua aberto, da raiz para dentro. */
  abertos: Container[];
  /** Até onde o texto pode ser cortado com um membro inteiro no fim. */
  corte: number;
}

/**
 * Onde estão os cortes seguros.
 *
 * Só é seguro cortar depois de um membro completo: uma string de valor que
 * fechou, um objeto ou lista que fechou, ou logo depois de uma abertura. Chave
 * sem valor, número em andamento e `tru` a caminho de `true` não contam — todos
 * viram texto descartado.
 */
function ler(texto: string): Leitura {
  const abertos: Container[] = [];
  let corte = 0;
  let emString = false;
  let escapando = false;
  let chave = false;
  // Em lista todo item é valor; em objeto, só depois dos dois-pontos.
  let esperandoValor = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (emString) {
      if (escapando) escapando = false;
      else if (c === "\\") escapando = true;
      else if (c === '"') {
        emString = false;
        if (!chave) corte = i + 1;
      }
      continue;
    }

    if (c === '"') {
      emString = true;
      chave = abertos.at(-1) === "obj" && !esperandoValor;
    } else if (c === ":") {
      esperandoValor = true;
    } else if (c === ",") {
      corte = i;
      esperandoValor = abertos.at(-1) === "arr";
    } else if (c === "{" || c === "[") {
      abertos.push(c === "{" ? "obj" : "arr");
      corte = i + 1;
      esperandoValor = c === "[";
    } else if (c === "}" || c === "]") {
      abertos.pop();
      corte = i + 1;
      esperandoValor = false;
    }
  }

  return { abertos, corte };
}

/** Nada conhecido ainda: `{}` e `[]` são "abriu e não disse nada". */
function vazio(valor: unknown): boolean {
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === "object" && valor !== null) return Object.keys(valor).length === 0;
  return valor === undefined || valor === null;
}

export function lerJsonParcial(cru: string): unknown {
  const texto = cru.trim();
  if (texto.length === 0) return null;

  try {
    const completo = JSON.parse(texto);
    return vazio(completo) ? null : completo;
  } catch {
    // Segue para o caminho do incompleto.
  }

  const { corte } = ler(texto);
  const cortado = texto.slice(0, corte).replace(/[\s,]+$/, "");
  if (cortado.length === 0) return null;

  const fechadores = ler(cortado)
    .abertos.reverse()
    .map((tipo) => (tipo === "obj" ? "}" : "]"))
    .join("");

  try {
    const parcial = JSON.parse(cortado + fechadores);
    return vazio(parcial) ? null : parcial;
  } catch {
    return null;
  }
}
