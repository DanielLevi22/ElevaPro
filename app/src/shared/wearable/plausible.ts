/** Faixa fechada que um valor lido da plataforma precisa respeitar. */
export interface Bounds {
  min: number;
  max: number;
}

/** Minutos de uma noite, aceitos pelo CHECK da `0046`. */
export const SLEEP_MINUTES: Bounds = { min: 1, max: 1440 };

/** FC de repouso, aceita pelo CHECK da `0046`. */
export const RESTING_BPM: Bounds = { min: 20, max: 200 };

/**
 * FC média em esforço. 30 bpm é abaixo do atleta de endurance mais bradicárdico;
 * 230 é acima da FC máxima de qualquer adulto. É a faixa do CHECK da `0049`.
 */
export const WORKOUT_BPM: Bounds = { min: 30, max: 230 };

/**
 * Barreira entre o que a plataforma de saúde devolve e o que o app usa.
 *
 * O dado vem de um app de terceiro — Zepp, Mi Fitness, Garmin Connect — que pode
 * gravar campo faltando ou fora de escala. Sem esta guarda, `NaN` e `Infinity`
 * viram null na serialização e a métrica some sem erro; um valor absurdo bate no
 * CHECK do banco e derruba a gravação inteira, levando junto o que estava certo.
 *
 * @example
 * plausibleInteger(record.beatsPerMinute, RESTING_BPM); // 58, ou null
 */
export function plausibleInteger(value: number, bounds: Bounds): number | null {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= bounds.min && rounded <= bounds.max ? rounded : null;
}
