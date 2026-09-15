import type { HealthDailyMetric } from '@elevapro/shared';
import { localDateKey } from '@/services/healthSync';

/**
 * Cada número da Saúde do dia aparece contra a linha de base da própria pessoa,
 * nunca contra uma referência de população: 58 bpm de repouso não quer dizer nada
 * sozinho, e 58 quando a média dela é 52 quer dizer bastante. É também o que separa
 * acompanhamento de treino de parecer clínico.
 */

export interface BaselineComparison {
  average: number;
  difference: number;
}

/** Média de dois dias tem cara de medição e não é uma. */
const MIN_BASELINE_DAYS = 3;

/**
 * Hoje contra a média dos dias anteriores, ou `null` sem leitura de hoje ou com menos
 * de 3 dias de base. A média não contém hoje: conter achataria o desvio que interessa.
 *
 * @example compareWithBaseline(470, [420, 440, 430]) // { average: 430, difference: 40 }
 */
export function compareWithBaseline(
  today: number | null,
  previous: (number | null)[]
): BaselineComparison | null {
  if (today === null) return null;
  const base = previous.filter((value): value is number => value !== null);
  if (base.length < MIN_BASELINE_DAYS) return null;
  const average = Math.round(base.reduce((sum, value) => sum + value, 0) / base.length);
  return { average, difference: Math.round(today - average) };
}

export interface WeekBar {
  date: string;
  /** A inicial do dia da semana, como o kit escreve: S T Q Q S S D. */
  label: string;
  value: number | null;
}

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
const WEEK = 7;

/**
 * Os 7 dias até `today`, do mais antigo ao de hoje, com o dia sem linha como vazio.
 *
 * @example lastSevenDays(history, new Date(), (day) => day.sleep_minutes)
 */
export function lastSevenDays(
  days: HealthDailyMetric[],
  today: Date,
  pick: (day: HealthDailyMetric) => number | null
): WeekBar[] {
  const byDate = new Map(days.map((item) => [item.date, item]));
  return Array.from({ length: WEEK }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (WEEK - 1 - index)
    );
    const key = localDateKey(date);
    const row = byDate.get(key);
    return {
      date: key,
      label: WEEKDAY_INITIALS[date.getDay()],
      value: row ? pick(row) : null,
    };
  });
}
