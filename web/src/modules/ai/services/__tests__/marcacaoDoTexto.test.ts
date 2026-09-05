import { describe, expect, it } from "vitest";
import { pedacosDoTexto } from "../marcacaoDoTexto";

/**
 * O assistente escreve em markdown e a bolha mostrava o texto cru: `**Aprovar**`
 * chegava com os asteriscos, e o destaque virava ruído justamente nas frases
 * que ele quis destacar.
 *
 * O outro lado importa igual: marca sem par é asterisco de verdade — de uma
 * multiplicação, de uma nota — e não pode comer o resto da frase procurando o
 * fechamento.
 */

const tipos = (texto: string) => pedacosDoTexto(texto).map((p) => p.tipo);
const textos = (texto: string) => pedacosDoTexto(texto).map((p) => p.texto);

describe("marcação do texto", () => {
  it("negrito perde os asteriscos e vira negrito", () => {
    expect(pedacosDoTexto("Clique em **Aprovar**")).toEqual([
      { tipo: "texto", texto: "Clique em " },
      { tipo: "negrito", texto: "Aprovar" },
    ]);
  });

  it("itálico e código também", () => {
    expect(tipos("um *destaque* e um `codigo`")).toEqual(["texto", "italico", "texto", "codigo"]);
  });

  // `**` também casa com a regra de um asterisco só: sem a ordem certa,
  // `**Aprovar**` viraria itálico com asteriscos sobrando nas pontas.
  it("negrito ganha do itálico, e não sobra asterisco", () => {
    expect(pedacosDoTexto("**Aprovar**")).toEqual([{ tipo: "negrito", texto: "Aprovar" }]);
    expect(textos("**Aprovar**").join("")).not.toContain("*");
  });

  it("marca sem par continua sendo o caractere que a pessoa vê", () => {
    expect(pedacosDoTexto("3 * 4 = 12")).toEqual([{ tipo: "texto", texto: "3 * 4 = 12" }]);
    expect(pedacosDoTexto("abre **e não fecha")).toEqual([
      { tipo: "texto", texto: "abre **e não fecha" },
    ]);
  });

  // Marca não atravessa linha: um asterisco no fim de um parágrafo não pode
  // formatar até encontrar outro três parágrafos abaixo.
  it("marca não atravessa quebra de linha", () => {
    expect(tipos("um *pedaço\ne outro* aqui")).toEqual(["texto"]);
  });

  it("texto sem marcação nenhuma atravessa intacto", () => {
    const frase = "Qual o objetivo principal do aluno?";

    expect(pedacosDoTexto(frase)).toEqual([{ tipo: "texto", texto: frase }]);
  });

  it("texto vazio não vira pedaço nenhum", () => {
    expect(pedacosDoTexto("")).toEqual([]);
  });

  // A frase inteira precisa sobreviver: formatar não pode perder caractere.
  it("não perde texto pelo caminho", () => {
    const frase = "Antes de montar, preciso saber: **onde ele treina?** Diga `casa` ou academia.";
    const semMarcas = frase.replace(/\*\*/g, "").replace(/`/g, "");

    expect(textos(frase).join("")).toBe(semMarcas);
  });
});
