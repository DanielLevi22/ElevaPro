import { type IdDoVeredito, LIMIARES_PADRAO, type Limiares } from "./agachamento";
import { type Gravacao, reproduzir } from "./gravacao";

/**
 * A varredura de limiar.
 *
 * Roda o corpus inteiro de gravações rotuladas contra cada limiar candidato e
 * devolve a matriz de confusão de cada um. É o que transforma a escolha do
 * número em leitura de erro, em vez de opinião — e o `ADR-0022` é a lembrança
 * de por que isso importa: os primeiros limiares do body scan foram chutados e
 * barravam captura boa até alguém medir.
 *
 * Roda o **julgador de verdade**, não uma simulação dele. Uma varredura que
 * reimplementasse a regra responderia pela reimplementação.
 */

/** Um limiar candidato, com o erro que ele comete no corpus. */
export interface PontoDaVarredura {
  limiar: number;
  /** Repetições rotuladas fundas que o julgador chamou de fundas. */
  fundoComoFundo: number;
  /** Rotuladas fundas que ele chamou de rasas. */
  fundoComoFaltou: number;
  faltouComoFaltou: number;
  /** Rotuladas rasas que ele chamou de fundas — o erro que mais custa. */
  faltouComoFundo: number;
  /** Repetições julgadas ao todo. */
  total: number;
  /** Fração de acerto, de 0 a 1. `0` quando nenhuma repetição foi detectada. */
  acuracia: number;
}

function contar(vereditos: IdDoVeredito[], rotulo: IdDoVeredito) {
  const comoFundo = vereditos.filter((v) => v === "fundo").length;

  return rotulo === "fundo"
    ? { certo: comoFundo, errado: vereditos.length - comoFundo }
    : { certo: vereditos.length - comoFundo, errado: comoFundo };
}

/**
 * Avalia um limiar candidato contra o corpus inteiro.
 *
 * Só `fundo` varia; o resto dos limiares fica no que estiver em `base`. Varrer
 * cinco eixos ao mesmo tempo produziria um número que ninguém consegue
 * defender, e o critério de profundidade tem um eixo só que importa.
 */
export function avaliarLimiar(
  gravacoes: Gravacao[],
  limiar: number,
  base: Limiares = LIMIARES_PADRAO,
): PontoDaVarredura {
  const ponto: PontoDaVarredura = {
    limiar,
    fundoComoFundo: 0,
    fundoComoFaltou: 0,
    faltouComoFaltou: 0,
    faltouComoFundo: 0,
    total: 0,
    acuracia: 0,
  };

  for (const gravacao of gravacoes) {
    const { vereditos } = reproduzir(gravacao.quadros, { ...base, fundo: limiar });
    const { certo, errado } = contar(vereditos, gravacao.rotulo);

    if (gravacao.rotulo === "fundo") {
      ponto.fundoComoFundo += certo;
      ponto.fundoComoFaltou += errado;
    } else {
      ponto.faltouComoFaltou += certo;
      ponto.faltouComoFundo += errado;
    }

    ponto.total += vereditos.length;
  }

  const acertos = ponto.fundoComoFundo + ponto.faltouComoFaltou;
  // Corpus em que nada foi detectado tem acurácia zero, não indefinida nem um.
  // Limiar que nunca dispara não pode se apresentar como perfeito.
  ponto.acuracia = ponto.total === 0 ? 0 : acertos / ponto.total;

  return ponto;
}

/**
 * Os candidatos de `de` até `ate`, de `passo` em `passo`.
 *
 * Gerado em vez de recebido pronto para que a grade seja regular: candidatos
 * escolhidos a dedo escondem o formato da curva, e o formato é o que diz se o
 * limiar está num platô seguro ou numa borda em que um centímetro muda tudo.
 */
export function varrer(
  gravacoes: Gravacao[],
  de = -0.3,
  ate = 0.3,
  passo = 0.02,
  base: Limiares = LIMIARES_PADRAO,
): PontoDaVarredura[] {
  const pontos: PontoDaVarredura[] = [];

  // Contagem inteira em vez de somar `passo` num acumulador: somar 0.02 trinta
  // vezes acumula erro de ponto flutuante e a grade sai torta.
  const passos = Math.round((ate - de) / passo);

  for (let i = 0; i <= passos; i += 1) {
    pontos.push(avaliarLimiar(gravacoes, de + i * passo, base));
  }

  return pontos;
}

/**
 * O melhor ponto da varredura — como **sugestão**, não como escolha.
 *
 * Empate resolve pelo limiar mais próximo de zero, que é o critério que o
 * personal enuncia. Sem esse desempate, um platô de acurácia igual devolveria a
 * borda da grade só porque ela veio primeiro no laço.
 *
 * Quem escolhe é quem olha a matriz de confusão: acurácia igual pode esconder
 * erros de custo bem diferente — chamar de funda uma repetição rasa é pior que
 * o contrário, porque valida o que deveria corrigir.
 */
export function sugerirLimiar(pontos: PontoDaVarredura[]): PontoDaVarredura | null {
  let melhor: PontoDaVarredura | null = null;

  for (const ponto of pontos) {
    if (melhor === null || ponto.acuracia > melhor.acuracia) {
      melhor = ponto;
      continue;
    }

    if (ponto.acuracia === melhor.acuracia && Math.abs(ponto.limiar) < Math.abs(melhor.limiar)) {
      melhor = ponto;
    }
  }

  return melhor;
}
