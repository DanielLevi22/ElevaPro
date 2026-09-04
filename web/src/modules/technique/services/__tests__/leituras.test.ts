import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { describe, expect, it } from "vitest";
import { fundosPorRepeticao, type Leitura, leituraEm } from "../leituras";

const SEM_PONTOS: NormalizedLandmark[] = [];

function leitura(tempo: number, profundidade: number | null, repeticoes: number): Leitura {
  return { tempo, profundidade, fase: "em-pe", repeticoes, pontos: SEM_PONTOS };
}

describe("leituraEm", () => {
  const LEITURAS = [0, 0.1, 0.2, 0.3].map((t) => leitura(t, 0, 0));

  it("devolve a leitura mais próxima, e não a anterior à esquerda", () => {
    expect(leituraEm(LEITURAS, 0.19)?.tempo).toBe(0.2);
    expect(leituraEm(LEITURAS, 0.11)?.tempo).toBe(0.1);
  });

  it("não sai do vetor nos extremos", () => {
    expect(leituraEm(LEITURAS, -5)?.tempo).toBe(0);
    expect(leituraEm(LEITURAS, 99)?.tempo).toBe(0.3);
  });

  it("devolve nulo sem leitura nenhuma, em vez de estourar", () => {
    expect(leituraEm([], 1)).toBeNull();
  });
});

describe("fundosPorRepeticao", () => {
  // A regra que a tela existe para mostrar: o veredito sai do ponto mais fundo
  // da repetição, não da profundidade no instante em que ela fecha — que é
  // sempre em pé, porque é subindo que o contador incrementa.
  it("guarda o extremo da repetição, não a profundidade do fechamento", () => {
    const fundos = fundosPorRepeticao([
      leitura(0, -0.9, 0),
      leitura(0.5, 0.15, 0),
      leitura(1, -0.9, 1),
    ]);

    expect(fundos).toEqual([{ indice: 1, maisFundo: 0.15, tempo: 0.5, veredito: "fundo" }]);
  });

  it("julga rasa a repetição cujo extremo não passou do limiar", () => {
    const fundos = fundosPorRepeticao([
      leitura(0, -0.9, 0),
      leitura(0.5, -0.1, 0),
      leitura(1, -0.9, 1),
    ]);

    expect(fundos[0]).toMatchObject({ maisFundo: -0.1, veredito: "faltou" });
  });

  it("reinicia o extremo a cada repetição, para uma funda não contaminar a seguinte", () => {
    const fundos = fundosPorRepeticao([
      leitura(0, 0.3, 0),
      leitura(1, 0.3, 1),
      leitura(2, -0.2, 1),
      leitura(3, -0.2, 2),
    ]);

    expect(fundos.map((f) => f.veredito)).toEqual(["fundo", "faltou"]);
  });

  it("ignora quadro sem profundidade, que é o julgador calando e não uma medida", () => {
    const fundos = fundosPorRepeticao([
      leitura(0, null, 0),
      leitura(0.5, 0.2, 0),
      leitura(1, null, 1),
    ]);

    expect(fundos[0]).toMatchObject({ maisFundo: 0.2, tempo: 0.5 });
  });

  it("não inventa repetição quando o contador nunca subiu", () => {
    expect(fundosPorRepeticao([leitura(0, 0.5, 0), leitura(1, 0.6, 0)])).toEqual([]);
  });
});
