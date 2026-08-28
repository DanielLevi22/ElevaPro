/**
 * Escala de esforço percebido (RPE) — a tradução de 1–10 para palavra.
 *
 * Vive em `shared/` porque as duas pontas precisam dizer o mesmo: o aluno
 * escolhe "Difícil" no `WorkoutFeedbackModal` e o especialista tem de ler
 * "Difícil" no feed de atividades. Com uma tabela em cada lado, os dois falam
 * de "7" com significados diferentes na primeira vez que alguém mexer numa
 * delas — e o RPE só vale como conversa se a escala for a mesma.
 */

/** Menor e maior valor aceitos. O modal do mobile é um slider de 1 a 10. */
export const RPE_MIN = 1;
export const RPE_MAX = 10;

interface FaixaRpe {
  /** Teto da faixa, inclusivo. */
  ate: number;
  label: string;
  emoji: string;
}

const FAIXAS: readonly FaixaRpe[] = [
  { ate: 2, label: "Muito Fácil", emoji: "😴" },
  { ate: 4, label: "Fácil", emoji: "🙂" },
  { ate: 6, label: "Moderado", emoji: "😅" },
  { ate: 8, label: "Difícil", emoji: "🥵" },
  { ate: RPE_MAX, label: "Muito Difícil", emoji: "💀" },
];

function faixaDe(valor: number): FaixaRpe {
  if (!Number.isInteger(valor) || valor < RPE_MIN || valor > RPE_MAX) {
    throw new Error(`RPE inválido: ${valor}. Esperado um inteiro entre ${RPE_MIN} e ${RPE_MAX}.`);
  }
  // A última faixa tem teto RPE_MAX, então o find sempre acha dentro do intervalo
  // já validado acima.
  return FAIXAS.find((faixa) => valor <= faixa.ate) as FaixaRpe;
}

/**
 * Rótulo da faixa, sem número e sem emoji.
 *
 * @example
 * rpeLabel(8); // 'Difícil'
 */
export function rpeLabel(valor: number): string {
  return faixaDe(valor).label;
}

/**
 * Rótulo com emoji — a forma que o aluno vê enquanto escolhe.
 *
 * @example
 * rpeLabelComEmoji(8); // 'Difícil 🥵'
 */
export function rpeLabelComEmoji(valor: number): string {
  const faixa = faixaDe(valor);
  return `${faixa.label} ${faixa.emoji}`;
}

/**
 * Número e rótulo juntos — a forma que o especialista lê no feed.
 *
 * Sem emoji de propósito: numa lista de dez alunos o emoji vira ruído, e o
 * especialista está comparando valores, não escolhendo o próprio.
 *
 * @example
 * formatRpe(8); // '8 — Difícil'
 */
export function formatRpe(valor: number): string {
  return `${valor} — ${rpeLabel(valor)}`;
}
