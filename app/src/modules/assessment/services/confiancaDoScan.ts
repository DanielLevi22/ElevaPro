import type { VereditosDaCaptura } from '@elevapro/shared';

/**
 * O quanto o aluno pode confiar nos números daquele scan.
 *
 * O aparelho já sabia de tudo isto — enquadramento não confirmado, contraluz,
 * tronco rotacionado, Escala declarada em vez de medida — e nada chegava à
 * tela. O aluno lia "cintura 89 cm" com a mesma cara, tivesse a foto saído
 * perfeita ou de costas para a janela com o corpo torto.
 *
 * Mostrar número sem mostrar o quanto ele vale é o mesmo defeito que a
 * `ADR-0022` corrigiu no prompt: precisão aparente sem procedência. O selo é o
 * contrapeso — e é ele que faz o aluno saber quando vale repetir o scan.
 *
 * Puro, e por isso testável sem tela, sem câmera e sem rede.
 */

export type NivelDeConfianca = 'alta' | 'media' | 'baixa';

export interface ConfiancaDoScan {
  nivel: NivelDeConfianca;
  /** O que rebaixou, em linguagem de aluno. Vazio quando nada rebaixou. */
  motivos: string[];
  /** Uma frase dizendo o que fazer com essa informação. */
  resumo: string;
}

export interface EntradaDaConfianca {
  vereditos: VereditosDaCaptura | null;
  /** O tronco estava rotacionado na foto frontal. Vem das medidas. */
  troncoRotacionado: boolean | null;
  /** De onde vieram altura e peso: medidos com fita, ou declarados. */
  escala: 'assessment' | 'informed' | null;
}

/**
 * Quanto cada problema pesa.
 *
 * Enquadramento não confirmado pesa mais que luz porque afeta a **Escala**: sem
 * o encaixe verificado, a conversão de pixel para centímetro pode estar
 * deslocada, e aí toda largura sai errada junto. Luz degrada o que o modelo
 * enxerga, mas não desloca a régua.
 *
 * Vale 3 porque 3 é o limiar: um problema grave derruba sozinho, e três leves
 * juntos também. Dois leves ficam em "média", que é ressalva e não reprovação.
 */
const PESO_QUE_DERRUBA = 3;

interface Achado {
  peso: number;
  texto: string;
}

function achados(entrada: EntradaDaConfianca): Achado[] {
  const { vereditos, troncoRotacionado, escala } = entrada;
  const lista: Achado[] = [];

  if (vereditos?.framing_confirmed === false) {
    lista.push({
      peso: PESO_QUE_DERRUBA,
      texto: 'O enquadramento não foi confirmado — as medidas podem estar deslocadas.',
    });
  }

  if (troncoRotacionado === true) {
    lista.push({
      peso: PESO_QUE_DERRUBA,
      texto:
        'Seu tronco estava um pouco virado na foto de frente — diferença entre os lados pode ser do ângulo.',
    });
  }

  if (vereditos?.quality_backlit) {
    lista.push({ peso: 1, texto: 'Você estava contra a luz.' });
  }
  if (vereditos?.quality_low_light) {
    lista.push({ peso: 1, texto: 'O cômodo estava escuro.' });
  }
  if (vereditos?.quality_blown_out) {
    lista.push({ peso: 1, texto: 'A luz estourou parte da imagem.' });
  }

  // Escala declarada não é erro de captura, mas é a maior fonte de erro
  // sistemático que sobra: tudo é convertido a partir da altura, e altura
  // informada de cabeça costuma vir arredondada para cima.
  if (escala === 'informed') {
    lista.push({
      peso: 1,
      texto:
        'Sua altura foi informada por você, não medida — peça uma avaliação para calibrar melhor.',
    });
  }

  return lista;
}

const RESUMOS: Record<NivelDeConfianca, string> = {
  alta: 'A captura saiu limpa. Pode comparar estes números com os do próximo scan.',
  media:
    'Dá para usar, com ressalva. Corrigindo o que está abaixo, o próximo scan fica mais preciso.',
  baixa: 'Vale repetir. Do jeito que a foto saiu, os números têm chance real de estar deslocados.',
};

/**
 * O selo, pronto para a tela.
 *
 * @example
 * const selo = avaliarConfianca({ vereditos, troncoRotacionado: false, escala: 'assessment' });
 * // { nivel: 'alta', motivos: [], resumo: 'A captura saiu limpa...' }
 */
export function avaliarConfianca(entrada: EntradaDaConfianca): ConfiancaDoScan {
  const lista = achados(entrada);
  const peso = lista.reduce((total, achado) => total + achado.peso, 0);

  // Um problema grave, ou três leves, derrubam para baixa. Qualquer coisa
  // abaixo disso é ressalva, não invalidação — scan marcado vale mais que scan
  // que não aconteceu, que é a decisão que o portão já tinha tomado.
  const nivel: NivelDeConfianca = peso === 0 ? 'alta' : peso >= 3 ? 'baixa' : 'media';

  return { nivel, motivos: lista.map((achado) => achado.texto), resumo: RESUMOS[nivel] };
}
