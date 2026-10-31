/** A faixa que o check-in aceita (0097): fora dela é erro de balança ou de unidade. */
const MIN_KG = 30;
const MAX_KG = 300;

/**
 * A média da semana das pesagens do app Saúde, com uma casa (F9). Pesagem fora
 * da faixa não entra: um 0 kg de balança sem pessoa puxaria a média para baixo.
 * Nula sem pesagem válida.
 *
 * @example averageWeight([77.4, 77.9, 0]) // 77.7
 */
export function averageWeight(samples: readonly number[]): number | null {
  const valid = samples.filter((kg) => Number.isFinite(kg) && kg >= MIN_KG && kg <= MAX_KG);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((sum, kg) => sum + kg, 0) / valid.length) * 10) / 10;
}
