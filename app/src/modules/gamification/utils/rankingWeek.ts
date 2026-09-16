const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Brasília é UTC−3 o ano inteiro desde que o horário de verão acabou, em 2019.
 * Por isso um deslocamento fixo, e não o `Intl` com fuso: o Hermes não traz a
 * base de fusos em todo aparelho, e o banco usa o mesmo relógio.
 */
const BRASILIA_OFFSET_MS = 3 * HOUR_MS;

/**
 * Quando a semana do ranking fecha: a próxima segunda às 00h00 de Brasília, que
 * é onde a `ranking_week_start` do banco começa a semana seguinte.
 *
 * @example weekEndsAt(new Date('2026-09-16T15:00:00Z')) // 2026-09-21T03:00:00.000Z
 */
export function weekEndsAt(now: Date): Date {
  const wallClock = new Date(now.getTime() - BRASILIA_OFFSET_MS);
  const daysSinceMonday = (wallClock.getUTCDay() + 6) % 7;
  const nextMonday = Date.UTC(
    wallClock.getUTCFullYear(),
    wallClock.getUTCMonth(),
    wallClock.getUTCDate() - daysSinceMonday + 7
  );
  return new Date(nextMonday + BRASILIA_OFFSET_MS);
}

/**
 * O prazo do cartão do ranking: "Encerra em 2 dias e 14 horas", e no domingo,
 * o último dia, "Encerra hoje às 23h59".
 *
 * @example deadlineLabel(new Date('2026-09-18T12:30:00Z')) // "Encerra em 2 dias e 14 horas"
 */
export function deadlineLabel(now: Date): string {
  const left = weekEndsAt(now).getTime() - now.getTime();
  if (left <= DAY_MS) return 'Encerra hoje às 23h59';

  const days = plural(Math.floor(left / DAY_MS), 'dia', 'dias');
  const hours = Math.floor((left % DAY_MS) / HOUR_MS);
  if (hours === 0) return `Encerra em ${days}`;
  return `Encerra em ${days} e ${plural(hours, 'hora', 'horas')}`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
