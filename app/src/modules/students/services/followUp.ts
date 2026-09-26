import {
  type ActivityDay,
  type ActivityEvent,
  type ActivityKind,
  addDays,
  formatPse,
  localDateOf,
  shortMonthOf,
} from '@elevapro/shared';

/**
 * A linha do tempo do Acompanhamento, derivada do feed de atividades
 * (`createActivityService.fetchStudentActivities`).
 */

/** Os chips da linha do tempo. `all` é o "Histórico" do kit. */
export type TimelineFilter = 'all' | 'training' | 'nutrition' | 'measures';

const KINDS_BY_FILTER: Record<Exclude<TimelineFilter, 'all'>, readonly ActivityKind[]> = {
  training: ['workout', 'cardio'],
  nutrition: ['meal', 'diet_plan'],
  measures: ['assessment', 'body_scan', 'anamnesis'],
};

/**
 * Um cartão da linha do tempo.
 *
 * Não tem `studentNote`, de propósito: a nota é o relato livre do aluno (Art.
 * 11) e o app do especialista não a exibe. O tipo sem o campo impede que ela
 * chegue ao estado da tela por descuido.
 */
export interface TimelineEntry {
  id: string;
  kind: ActivityKind;
  /** "Hoje · 07:12", "Ontem", "10 set · 19:20". */
  when: string;
  title: string;
  detail: string | null;
}

/**
 * Os eventos dos dias, do mais recente ao mais antigo, filtrados pelo chip.
 *
 * @example timelineEntries(days, 'training', '2026-09-26')
 */
export function timelineEntries(
  days: readonly ActivityDay[],
  filter: TimelineFilter,
  today: string
): TimelineEntry[] {
  const kinds = filter === 'all' ? null : KINDS_BY_FILTER[filter];
  return days
    .flatMap((day) => day.events.map((event) => ({ event, date: day.date })))
    .filter(({ event }) => kinds === null || kinds.includes(event.kind))
    .map(({ event, date }) => toEntry(event, date, today));
}

function toEntry(event: ActivityEvent, date: string, today: string): TimelineEntry {
  return {
    id: event.id,
    kind: event.kind,
    when: whenLabel(event.at, date, today),
    title: event.title,
    detail: detailLabel(event),
  };
}

function detailLabel(event: ActivityEvent): string | null {
  const parts = [event.detail, event.pse === null ? null : `PSE ${formatPse(event.pse)}`];
  const filled = parts.filter((part): part is string => part !== null);
  return filled.length > 0 ? filled.join(' · ') : null;
}

/**
 * O dia relativo e, quando o evento tem horário, a hora local.
 *
 * Refeição chega só com a data (`logged_date`): `new Date("2026-09-10")` é lido
 * como meia-noite UTC e mostraria 21:00 do dia anterior no Brasil.
 */
function whenLabel(at: string, date: string, today: string): string {
  const day = dayLabel(date, today);
  if (!at.includes('T')) return day;
  const instant = new Date(at);
  const hours = String(instant.getHours()).padStart(2, '0');
  const minutes = String(instant.getMinutes()).padStart(2, '0');
  return `${day} · ${hours}:${minutes}`;
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Hoje';
  if (date === addDays(today, -1)) return 'Ontem';
  return `${date.slice(8, 10)} ${shortMonthOf(date)}`;
}

/** Hoje no fuso do aparelho, a mesma chave de dia que o feed usa. */
export function localToday(): string {
  return localDateOf(new Date());
}
