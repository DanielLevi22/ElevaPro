import { MS_POR_SEGUNDO } from '@elevapro/shared';

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

/** Zerado e parado: como a série abre, e como fica depois do "Zerar". */
export function cronometroParado(): Cronometro {
  return { acumuladoMs: 0, desde: null };
}

/**
 * Põe o cronômetro para correr. Já correndo, nada muda — um segundo toque não
 * reinicia a contagem.
 *
 * @example soltarCronometro(cronometroParado(), Date.now())
 */
export function soltarCronometro(cronometro: Cronometro, agora: number): Cronometro {
  return cronometro.desde === null ? { ...cronometro, desde: agora } : cronometro;
}

/**
 * Para o cronômetro guardando o que contou até aqui.
 *
 * @example pausarCronometro(correndo, Date.now()).desde // null
 */
export function pausarCronometro(cronometro: Cronometro, agora: number): Cronometro {
  if (cronometro.desde === null) return cronometro;
  return { acumuladoMs: cronometro.acumuladoMs + (agora - cronometro.desde), desde: null };
}

/**
 * Segundos inteiros contados, correndo ou não.
 *
 * @example segundosDoCronometro({ acumuladoMs: 4500, desde: null }, Date.now()) // 4
 */
export function segundosDoCronometro(cronometro: Cronometro, agora: number): number {
  const correndo = cronometro.desde === null ? 0 : Math.max(0, agora - cronometro.desde);
  return Math.floor((cronometro.acumuladoMs + correndo) / MS_POR_SEGUNDO);
}
