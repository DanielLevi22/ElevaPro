import { describe, expect, it } from "vitest";
import type { Gravacao, RotuloDaSerie } from "../gravacao";
import {
  avaliarLimiar,
  conferirCorpus,
  MINIMO_DE_SERIES,
  sugerirLimiar,
  varrer,
} from "../varredura";
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

/**
 * Corpus mínimo com separação conhecida.
 *
 * As fundas alcançam +0.2; as rasas param em −0.2. Qualquer limiar entre esses
 * dois valores separa o corpus perfeitamente — é a resposta que a varredura
 * precisa encontrar sozinha.
 */
const CORPUS: Gravacao[] = [
  gravacaoDe("fundo", [0.2, 0.25, 0.3]),
  gravacaoDe("faltou", [-0.2, -0.25, -0.3]),
];

describe("avaliarLimiar", () => {
  it("separa o corpus quando o limiar cai entre as duas populações", () => {
    const ponto = avaliarLimiar(CORPUS, 0);

    expect(ponto).toMatchObject({
      fundoComoFundo: 3,
      fundoComoFaltou: 0,
      faltouComoFaltou: 3,
      faltouComoFundo: 0,
      total: 6,
    });
    expect(ponto.acuracia).toBe(1);
  });

  it("chama tudo de raso quando o limiar sobe acima das repetições fundas", () => {
    const ponto = avaliarLimiar(CORPUS, 0.9);

    expect(ponto.fundoComoFaltou).toBe(3);
    expect(ponto.faltouComoFaltou).toBe(3);
    expect(ponto.acuracia).toBeCloseTo(0.5, 10);
  });

  it("chama tudo de fundo quando o limiar desce abaixo das rasas", () => {
    const ponto = avaliarLimiar(CORPUS, -0.9);

    expect(ponto.fundoComoFundo).toBe(3);
    expect(ponto.faltouComoFundo).toBe(3);
    expect(ponto.acuracia).toBeCloseTo(0.5, 10);
  });

  it("dá acurácia zero, e não um, para corpus sem repetição detectada", () => {
    // Limiar que nunca dispara não pode se apresentar como perfeito: era assim
    // que a varredura recomendaria o número que não funciona.
    const ponto = avaliarLimiar([], 0);

    expect(ponto.total).toBe(0);
    expect(ponto.acuracia).toBe(0);
  });
});

describe("varrer", () => {
  it("produz uma grade regular de candidatos", () => {
    const pontos = varrer(CORPUS, -0.2, 0.2, 0.1);

    expect(pontos).toHaveLength(5);
    expect(pontos.map((p) => Number(p.limiar.toFixed(2)))).toEqual([-0.2, -0.1, 0, 0.1, 0.2]);
  });

  it("mantém a grade regular apesar do ponto flutuante", () => {
    // Somar 0.02 num acumulador trinta vezes deriva; a contagem inteira não.
    const pontos = varrer(CORPUS, -0.3, 0.3, 0.02);

    expect(pontos).toHaveLength(31);
    expect(pontos[pontos.length - 1].limiar).toBeCloseTo(0.3, 10);
  });
});

describe("sugerirLimiar", () => {
  it("encontra sozinho um limiar que separa o corpus", () => {
    const melhor = sugerirLimiar(varrer(CORPUS));

    expect(melhor?.acuracia).toBe(1);
    expect(melhor?.limiar).toBeGreaterThan(-0.2);
    expect(melhor?.limiar).toBeLessThan(0.2);
  });

  it("desempata pelo limiar mais próximo de zero", () => {
    // Todo o platô entre as duas populações acerta 100%. Sem desempate, a
    // sugestão seria a borda da grade só por ter vindo primeiro no laço — e a
    // borda é o ponto mais frágil do platô.
    const melhor = sugerirLimiar(varrer(CORPUS, -0.1, 0.1, 0.05));

    expect(melhor?.limiar).toBeCloseTo(0, 10);
  });

  it("devolve nulo para varredura vazia", () => {
    expect(sugerirLimiar([])).toBeNull();
  });
});

describe("conferirCorpus", () => {
  it("acusa corpus de um rótulo só, em que qualquer limiar constante acerta tudo", () => {
    const saude = conferirCorpus([gravacaoDe("fundo", [0.2]), gravacaoDe("fundo", [0.3])]);

    expect(saude).toMatchObject({ series: 2, fundas: 2, rasas: 0, rotuloUnico: true });
  });

  it("acusa corpus pequeno demais para o platô da tabela significar algo", () => {
    const poucas = Array.from({ length: MINIMO_DE_SERIES - 1 }, (_, i) =>
      gravacaoDe(i % 2 === 0 ? "fundo" : "faltou", [i % 2 === 0 ? 0.2 : -0.2]),
    );

    expect(conferirCorpus(poucas)).toMatchObject({ pequeno: true, rotuloUnico: false });
  });

  it("não acusa nada quando o corpus é grande e balanceado", () => {
    const bastantes = Array.from({ length: MINIMO_DE_SERIES }, (_, i) =>
      gravacaoDe(i % 2 === 0 ? "fundo" : "faltou", [i % 2 === 0 ? 0.2 : -0.2]),
    );

    expect(conferirCorpus(bastantes)).toMatchObject({ pequeno: false, rotuloUnico: false });
  });

  // Sem isto, os dois avisos apareceriam na tela antes de alguém escolher
  // arquivo — a página abriria reclamando de um corpus que ninguém carregou.
  it("cala com corpus vazio, que não é corpus ruim e sim ausência de corpus", () => {
    expect(conferirCorpus([])).toMatchObject({
      series: 0,
      rotuloUnico: false,
      pequeno: false,
    });
  });
});
