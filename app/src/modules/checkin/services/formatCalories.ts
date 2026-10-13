/**
 * Calorias como a tela escreve: "3.081 kcal".
 *
 * @example formatKcal(3081) // "3.081 kcal"
 */
export function formatKcal(value: number): string {
  return `${Math.round(value).toLocaleString('pt-BR')} kcal`;
}

/**
 * A diferença com sinal, para o selo do antes → depois: "−150 kcal", "+150 kcal".
 *
 * @example formatKcalDelta(-150) // "−150 kcal"
 */
export function formatKcalDelta(delta: number): string {
  return `${delta > 0 ? '+' : '−'}${formatKcal(Math.abs(delta))}`;
}
