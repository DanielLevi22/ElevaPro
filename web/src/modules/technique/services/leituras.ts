import type { Fase } from "@elevapro/shared";
import { LIMIARES_PADRAO } from "@elevapro/shared";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * A leitura do julgador quadro a quadro, e o que se extrai dela.
 *
 * Puro de propósito: entra o que a análise produziu, sai o que a tela mostra.
 * Sem isto, o ponto mais fundo de cada repetição só existiria dentro de um
 * componente com vídeo, canvas e MediaPipe atados — e não teria como ser
 * testado sem browser.
 */

/**
 * O que o julgador viu num instante do vídeo.
 *
 * Guardado por quadro para que arrastar a barra do vídeo mostre a leitura
 * daquele ponto. Sem isto, a única forma de conferir se a medida faz sentido
 * seria com câmera ao vivo — o que exige uma câmera bem posicionada, e é
 * exatamente o que não se tem quando se está diagnosticando enquadramento.
 */
export interface Leitura {
  tempo: number;
  profundidade: number | null;
  fase: Fase;
  repeticoes: number;
  pontos: NormalizedLandmark[];
}

/**
 * A leitura mais próxima de um instante, por busca binária.
 *
 * Linear seria O(n) a cada `timeupdate`, que dispara várias vezes por segundo
 * sobre um vetor de milhares de quadros.
 *
 * @example
 * const atual = leituraEm(leituras, video.currentTime);
 */
export function leituraEm(leituras: Leitura[], tempo: number): Leitura | null {
  if (leituras.length === 0) return null;

  let inicio = 0;
  let fim = leituras.length - 1;

  while (inicio < fim) {
    const meio = Math.floor((inicio + fim) / 2);
    if (leituras[meio].tempo < tempo) inicio = meio + 1;
    else fim = meio;
  }

  const candidato = leituras[inicio];
  const anterior = leituras[Math.max(0, inicio - 1)];

  return Math.abs(anterior.tempo - tempo) < Math.abs(candidato.tempo - tempo)
    ? anterior
    : candidato;
}

/** O ponto mais fundo de uma repetição, e quando ele aconteceu. */
export interface FundoDaRepeticao {
  indice: number;
  maisFundo: number;
  tempo: number;
  veredito: "fundo" | "faltou";
}

/**
 * O fundo de cada repetição, extraído das leituras.
 *
 * Existe porque caçar o ponto mais fundo arrastando a barra é trabalhoso e
 * impreciso: entre duas repetições há dezenas de quadros, e o extremo dura
 * frações de segundo. O julgador já sabe onde ele está — basta mostrar.
 *
 * As repetições são separadas pelo instante em que o contador incrementa, que é
 * o mesmo instante em que o julgador fecha a repetição.
 *
 * @example
 * const fundos = fundosPorRepeticao(leituras);
 * fundos[0].tempo; // instante do ponto mais fundo da primeira repetição
 */
export function fundosPorRepeticao(leituras: Leitura[]): FundoDaRepeticao[] {
  const fundos: FundoDaRepeticao[] = [];
  let maisFundo = Number.NEGATIVE_INFINITY;
  let tempo = 0;

  for (const leitura of leituras) {
    if (leitura.profundidade !== null && leitura.profundidade > maisFundo) {
      maisFundo = leitura.profundidade;
      tempo = leitura.tempo;
    }

    if (leitura.repeticoes === fundos.length + 1) {
      fundos.push({
        indice: leitura.repeticoes,
        maisFundo,
        tempo,
        veredito: maisFundo >= LIMIARES_PADRAO.fundo ? "fundo" : "faltou",
      });
      maisFundo = Number.NEGATIVE_INFINITY;
    }
  }

  return fundos;
}
