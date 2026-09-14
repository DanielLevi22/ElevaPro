/**
 * Barreira entre o que a plataforma de saúde devolve e o que o app usa.
 *
 * O dado vem de um app de terceiro — Zepp, Mi Fitness, Garmin Connect — que pode
 * gravar campo faltando ou fora de escala. Sem esta guarda, `NaN` e `Infinity`
 * viram null na serialização e a métrica some sem erro; um valor absurdo bate no
 * CHECK do banco e derruba a gravação inteira, levando junto o que estava certo.
 *
 * @example
 * plausibleInteger(record.beatsPerMinute, 20, 200); // 58, ou null
 */
export function plausibleInteger(value: number, min: number, max: number): number | null {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= min && rounded <= max ? rounded : null;
}
