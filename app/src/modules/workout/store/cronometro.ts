/**
 * Um cronômetro que sobe, guardado como instantes: o tempo já acumulado e
 * desde quando está correndo.
 *
 * Instante, e não contagem de tiques, pelo mesmo motivo da sessão inteira: o
 * sistema suspende o app no meio da série, e a soma de tiques voltaria com
 * tempo a menos.
 *
 * @example
 * const correndo = soltarCronometro(cronometroParado(), Date.now());
 * segundosDoCronometro(correndo, Date.now() + 5000); // 5
 */
export interface Cronometro {
  /** Milissegundos contados até a última pausa. */
  acumuladoMs: number;
  /** Quando voltou a correr. Nulo enquanto parado. */
  desde: number | null;
}

export function cronometroParado(): Cronometro {
  return { acumuladoMs: 0, desde: null };
}

export function soltarCronometro(cronometro: Cronometro, agora: number): Cronometro {
  return cronometro.desde === null ? { ...cronometro, desde: agora } : cronometro;
}

export function pausarCronometro(cronometro: Cronometro, agora: number): Cronometro {
  if (cronometro.desde === null) return cronometro;
  return { acumuladoMs: cronometro.acumuladoMs + (agora - cronometro.desde), desde: null };
}

/** Segundos inteiros contados, correndo ou não. */
export function segundosDoCronometro(cronometro: Cronometro, agora: number): number {
  const correndo = cronometro.desde === null ? 0 : Math.max(0, agora - cronometro.desde);
  return Math.floor((cronometro.acumuladoMs + correndo) / 1000);
}
