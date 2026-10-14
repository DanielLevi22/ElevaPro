import { addDays, type WeeklyReport } from '@elevapro/shared';

/** Domingo, segunda e terça: depois disso, o relatório fica no perfil. */
const DAYS_ON_HOME = 2;

/**
 * Se o cartão "Relatório da semana" aparece na tela inicial (R0): do domingo
 * em que a semana fecha até terça, enquanto não for aberto. Semana sem nada
 * não vira cartão — não há o que contar.
 *
 * @example showReportCard(report, '2026-10-11', null) // true no domingo
 */
export function showReportCard(
  report: WeeklyReport,
  today: string,
  seenWeek: string | null
): boolean {
  if (report.tone === 'empty' || seenWeek === report.weekStart) return false;
  return today >= report.weekEnd && today <= addDays(report.weekEnd, DAYS_ON_HOME);
}
