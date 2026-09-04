import { describe, expect, it } from "vitest";
import {
  conferir,
  type Gravacao,
  type RotuloDaSerie,
  reproduzir,
  serializarGravacao,
} from "../gravacao";
import { umaRepeticaoAte } from "./corpo";

function gravacaoDe(rotulo: RotuloDaSerie, fundos: number[]): Gravacao {
  return {
    exercicio: "agachamento",
    rotulo,
    versaoDoModelo: "0.10.35",
    gravadoEm: "2026-09-01T00:00:00.000Z",
    quadros: fundos.flatMap(umaRepeticaoAte),
  };
}

describe("reproduzir", () => {
  it("roda a gravação inteira e devolve um veredito por repetição", () => {
    const { repeticoes, vereditos } = reproduzir(gravacaoDe("fundo", [0.2, -0.3, 0.4]).quadros);

    expect(repeticoes).toBe(3);
    expect(vereditos).toEqual(["fundo", "faltou", "fundo"]);
  });

  it("traduz os landmarks pelo mesmo caminho que o aparelho usa", () => {
    // A gravação guarda o observado — os 33 landmarks — e a tradução para
    // quadril/joelho/tornozelo acontece na reprodução. É isso que permite
    // calibrar outro critério contra as mesmas gravações, sem regravar.
    const { repeticoes } = reproduzir(umaRepeticaoAte(0.2));

    expect(repeticoes).toBe(1);
  });

  it("devolve zero para gravação vazia", () => {
    const { repeticoes, vereditos, fim } = reproduzir([]);

    expect(repeticoes).toBe(0);
    expect(vereditos).toEqual([]);
    expect(fim).toBeNull();
  });
});

describe("conferir", () => {
  it("conta acerto quando o julgador concorda com o rótulo humano", () => {
    expect(conferir(gravacaoDe("fundo", [0.2, 0.3, 0.5]))).toEqual({
      acertos: 3,
      erros: 0,
      total: 3,
    });
  });

  it("conta acerto numa série rasa", () => {
    // Esta é a regressão que importa: com um vocabulário paralelo para o rótulo
    // ("raso" em vez de "faltou"), a comparação compilaria e devolveria zero
    // acertos aqui — toda série rasa viraria erro total, sem nenhum sinal.
    expect(conferir(gravacaoDe("faltou", [-0.3, -0.2, -0.5]))).toEqual({
      acertos: 3,
      erros: 0,
      total: 3,
    });
  });

  it("separa acerto de erro numa série que o julgador leu ao contrário", () => {
    expect(conferir(gravacaoDe("fundo", [0.2, -0.3]))).toEqual({
      acertos: 1,
      erros: 1,
      total: 2,
    });
  });

  it("não conta série sem repetição detectada como acerto", () => {
    // Limiar que nunca dispara não pode se apresentar como perfeito. Somar
    // "nenhuma repetição" ao acerto esconderia exatamente esse caso.
    const gravacao: Gravacao = { ...gravacaoDe("fundo", []), quadros: [] };

    expect(conferir(gravacao)).toEqual({ acertos: 0, erros: 0, total: 0 });
  });
});

describe("serializarGravacao", () => {
  it("corta a precisão que o modelo não tem", () => {
    const gravacao: Gravacao = {
      exercicio: "agachamento",
      rotulo: "fundo",
      versaoDoModelo: "0.10.35",
      gravadoEm: "2026-09-01T00:00:00.000Z",
      quadros: [[{ x: 0.512345678901, y: 0.712345678901, visibility: 0.987654321 }]],
    };

    const lido = JSON.parse(serializarGravacao(gravacao)) as Gravacao;

    expect(lido.quadros[0][0]).toEqual({ x: 0.5123, y: 0.7123, visibility: 0.9877 });
  });

  it("não inventa visibilidade para fonte que não reporta", () => {
    const gravacao: Gravacao = {
      exercicio: "agachamento",
      rotulo: "fundo",
      versaoDoModelo: "0.10.35",
      gravadoEm: "2026-09-01T00:00:00.000Z",
      quadros: [[{ x: 0.5, y: 0.5 }]],
    };

    const lido = JSON.parse(serializarGravacao(gravacao)) as Gravacao;

    expect(lido.quadros[0][0]).toEqual({ x: 0.5, y: 0.5 });
  });

  it("sobrevive a uma ida e volta pelo JSON sem mudar o veredito", () => {
    // A serialização é lossy de propósito. O teste que importa não é que os
    // números sobrevivam — é que o julgamento sobreviva.
    const gravacao = gravacaoDe("fundo", [0.2, -0.3, 0.4]);
    const lido = JSON.parse(serializarGravacao(gravacao)) as Gravacao;

    expect(reproduzir(lido.quadros).vereditos).toEqual(reproduzir(gravacao.quadros).vereditos);
  });
});
