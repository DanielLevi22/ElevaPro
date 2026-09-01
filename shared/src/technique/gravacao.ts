import {
  avaliarAgachamento,
  type IdDoVeredito,
  LIMIARES_PADRAO,
  type Limiares,
  type Movimento,
} from "./agachamento";
import { fatosDeLandmarks, type LandmarkNormalizado } from "./fatos";

/**
 * Uma série gravada, com o rótulo que um humano deu a ela.
 *
 * É o formato que o painel de calibração exporta e que a suíte de testes lê —
 * e é de propósito que ele **não guarda vídeo nem imagem**, só os fatos de cada
 * quadro. O boneco de palito é o suficiente para reproduzir o julgamento
 * inteiro, e é a maior minimização possível para um dado que descreve o corpo
 * de alguém.
 */

/**
 * O rótulo de uma série homogênea.
 *
 * Séries homogêneas — "estas cinco são todas no fundo" — em vez de rótulo por
 * repetição, porque rotular assistindo repetição a repetição é o que faz
 * projeto de dataset morrer na segunda semana.
 *
 * **É o mesmo tipo do veredito, de propósito.** Um vocabulário paralelo para o
 * rótulo ("raso" contra "faltou") compilaria — os tipos se sobrepõem em
 * "fundo" — e faria toda série rasa contar como erro total, silenciosamente.
 * Com o mesmo tipo, não há tradução para errar.
 */
export type RotuloDaSerie = IdDoVeredito;

/**
 * Os exercícios que o julgador conhece.
 *
 * União de um só, e de propósito: quando o segundo entrar, alargá-la vira erro
 * de compilação em cada lugar que precisa decidir — que é exatamente o
 * lembrete que se quer. Uma `string` livre aqui aceitaria "agachamento",
 * "Agachamento" e "squat" como coisas diferentes, calada.
 */
export type Exercicio = "agachamento";

export interface Gravacao {
  exercicio: Exercicio;
  rotulo: RotuloDaSerie;
  /** Versão do MediaPipe que produziu os landmarks. */
  versaoDoModelo: string;
  gravadoEm: string;
  /**
   * Os 33 landmarks de cada quadro, como o modelo os viu.
   *
   * **Guarda o observado, não o derivado.** Guardar `FatosDoMovimento` —
   * quadril, joelho e tornozelo — seria guardar o recorte que o critério do
   * agachamento faz, e aí nenhuma gravação existente serviria para calibrar
   * flexão de braço, que precisa de ombro, cotovelo e punho. O vídeo já não
   * existe mais para regravar; o que sobra tem que bastar.
   *
   * Custa ~10× mais que os fatos, o que ainda é pequeno — e é a diferença
   * entre um corpus reaproveitável e um corpus de uso único.
   */
  quadros: LandmarkNormalizado[][];
}

export interface Reproducao {
  repeticoes: number;
  vereditos: IdDoVeredito[];
  /** O estado final, para quem quiser inspecionar onde a máquina parou. */
  fim: Movimento | null;
}

/**
 * Roda uma gravação inteira pelo julgador.
 *
 * É o mesmo `avaliarAgachamento` que o aparelho executa quadro a quadro — aqui
 * só acelerado. Por isso a varredura de limiar responde pelo comportamento
 * real, e não por uma simulação dele.
 *
 * @example
 * const { vereditos } = reproduzir(gravacao.quadros);
 */
export function reproduzir(
  quadros: LandmarkNormalizado[][],
  limiares: Limiares = LIMIARES_PADRAO,
): Reproducao {
  let movimento: Movimento | null = null;
  const vereditos: IdDoVeredito[] = [];

  for (const pontos of quadros) {
    // A tradução de landmark para fato acontece aqui, e não na gravação, para
    // que ela seja a mesma que roda no aparelho: se o corpus guardasse o fato
    // já traduzido, uma mudança em `fatosDeLandmarks` deixaria de aparecer na
    // varredura e o limiar passaria a valer para uma leitura que não existe
    // mais.
    movimento = avaliarAgachamento(fatosDeLandmarks(pontos), movimento ?? {}, limiares);
    if (movimento.veredito) vereditos.push(movimento.veredito.id);
  }

  return {
    repeticoes: movimento?.repeticoes ?? 0,
    vereditos,
    fim: movimento,
  };
}

export interface Conferencia {
  /** Repetições cujo veredito bateu com o rótulo humano. */
  acertos: number;
  erros: number;
  total: number;
}

/**
 * Compara o que o julgador disse com o que o humano rotulou.
 *
 * Uma série homogênea rotulada "fundo" espera que **toda** repetição saia
 * funda; qualquer outra coisa é erro. É a unidade que alimenta a matriz de
 * confusão da varredura.
 *
 * Série sem nenhuma repetição detectada conta como zero de tudo, e não como
 * acerto: não achar repetição nenhuma numa série que existe é falha, e somá-la
 * como acerto esconderia justamente o limiar que nunca dispara.
 */
export function conferir(gravacao: Gravacao, limiares: Limiares = LIMIARES_PADRAO): Conferencia {
  const { vereditos } = reproduzir(gravacao.quadros, limiares);
  const acertos = vereditos.filter((v) => v === gravacao.rotulo).length;

  return {
    acertos,
    erros: vereditos.length - acertos,
    total: vereditos.length,
  };
}
