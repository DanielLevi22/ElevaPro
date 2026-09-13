/**
 * Percepção subjetiva de esforço (PSE) — o 1 a 10 que o aluno responde no fim
 * da sessão, e a sensação que o kit dá a cada faixa.
 *
 * Vive em `shared/` porque as duas pontas precisam dizer o mesmo: o aluno toca
 * em "Puxado" no feedback do mobile e o especialista tem de ler "Puxado" no
 * feed do web. Com uma tabela em cada lado, os dois falam de "7" com
 * significados diferentes na primeira vez que alguém mexer numa delas.
 *
 * A sensação é **derivada** da PSE e não é gravada. O banco guarda só o número
 * (`workout_sessions.perceived_exertion`): gravar a palavra também seria o
 * mesmo dado duas vezes, e as duas poderiam discordar.
 */

/** Menor e maior valor aceitos. O feedback do kit mostra dez blocos. */
export const PSE_MIN = 1;
export const PSE_MAX = 10;

export interface Sensacao {
  chave: "leve" | "na_medida" | "puxado";
  rotulo: string;
  /** Teto da faixa, inclusivo. */
  ate: number;
  /** A PSE que tocar nesta sensação escolhe: o meio da faixa. */
  pse: number;
}

/**
 * As três sensações do kit, em ordem. As faixas saem do próprio kit, que marca
 * 7 como "Puxado" no feedback.
 *
 * O resumo do descanso do kit chama o mesmo 7 de "Pesado". Vale "Puxado", da
 * tela onde o aluno escolhe (issue #295).
 */
export const SENSACOES: readonly Sensacao[] = [
  { chave: "leve", rotulo: "Leve", ate: 3, pse: 2 },
  { chave: "na_medida", rotulo: "Na medida", ate: 6, pse: 5 },
  { chave: "puxado", rotulo: "Puxado", ate: PSE_MAX, pse: 8 },
];

/**
 * A sensação de uma PSE.
 *
 * @example
 * sensacaoDaPse(7).rotulo; // 'Puxado'
 */
export function sensacaoDaPse(pse: number): Sensacao {
  if (!Number.isInteger(pse) || pse < PSE_MIN || pse > PSE_MAX) {
    throw new Error(`PSE inválida: ${pse}. Esperado um inteiro entre ${PSE_MIN} e ${PSE_MAX}.`);
  }
  // A última faixa tem teto PSE_MAX, então o find sempre acha dentro do
  // intervalo já validado acima.
  return SENSACOES.find((sensacao) => pse <= sensacao.ate) as Sensacao;
}

/**
 * Número e sensação juntos — a forma que o especialista lê no feed.
 *
 * @example
 * formatPse(7); // '7 — Puxado'
 */
export function formatPse(pse: number): string {
  return `${pse} — ${sensacaoDaPse(pse).rotulo}`;
}
