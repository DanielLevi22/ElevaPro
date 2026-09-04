import { beforeEach, describe, expect, it } from "vitest";
import { type Agendador, criarAcumuladorDeTexto } from "../acumuladorDeTexto";

/**
 * O acumulador existe para reduzir render, nunca para reduzir texto.
 *
 * Estes testes afirmam as duas metades: que vários pedaços viram uma aplicação
 * só, e que nada se perde no caminho — inclusive o que chega depois do último
 * quadro, que é o pedaço final da resposta.
 */

let quadros: Array<() => void>;
let aplicados: string[];

/** Agendador falso: guarda o callback em vez de esperar o navegador. */
const agendar: Agendador = (aplicar) => {
  quadros.push(aplicar);
};

/** Roda os quadros pendentes, como o navegador faria. */
function passarQuadro(): void {
  const pendentes = quadros;
  quadros = [];
  for (const quadro of pendentes) quadro();
}

beforeEach(() => {
  quadros = [];
  aplicados = [];
});

describe("acumulador de texto", () => {
  const acumulador = () => criarAcumuladorDeTexto((pedaco) => aplicados.push(pedaco), agendar);

  it("junta os pedaços do quadro numa aplicação só", () => {
    const texto = acumulador();

    texto.empurrar("Vou ");
    texto.empurrar("montar ");
    texto.empurrar("a proposta");

    expect(aplicados).toEqual([]);
    passarQuadro();
    expect(aplicados).toEqual(["Vou montar a proposta"]);
  });

  it("agenda um quadro por lote, não um por pedaço", () => {
    const texto = acumulador();

    texto.empurrar("a");
    texto.empurrar("b");
    texto.empurrar("c");

    expect(quadros).toHaveLength(1);
  });

  it("preserva a ordem entre quadros", () => {
    const texto = acumulador();

    texto.empurrar("primeiro");
    passarQuadro();
    texto.empurrar("segundo");
    passarQuadro();

    expect(aplicados).toEqual(["primeiro", "segundo"]);
  });

  // O último pedaço quase sempre chega depois do último quadro. Sem isto, a
  // resposta aparece truncada — o defeito seria pior que o que veio consertar.
  it("libera o que sobrou no fim do stream", () => {
    const texto = acumulador();

    texto.empurrar("começo");
    passarQuadro();
    texto.empurrar(" e fim");
    texto.liberar();

    expect(aplicados.join("")).toBe("começo e fim");
  });

  it("liberar sem nada pendente não aplica string vazia", () => {
    const texto = acumulador();

    texto.liberar();
    texto.empurrar("algo");
    passarQuadro();
    texto.liberar();

    expect(aplicados).toEqual(["algo"]);
  });

  // `aplicar` renderiza, e render pode receber texto novo do stream no meio.
  // Esse pedaço pertence ao próximo quadro — se o acumulador o zerasse depois
  // de aplicar, ele sumiria.
  it("não perde o pedaço que chega durante a aplicação", () => {
    const texto = criarAcumuladorDeTexto((pedaco) => {
      aplicados.push(pedaco);
      if (aplicados.length === 1) texto.empurrar(" tardio");
    }, agendar);

    texto.empurrar("no meio");
    passarQuadro();
    passarQuadro();

    expect(aplicados.join("")).toBe("no meio tardio");
  });
});
