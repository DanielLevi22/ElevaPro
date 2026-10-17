import {
  addDays,
  brazilDayStart,
  createSpecialistNoteService,
  createWeeklyReportService,
  type SpecialistNoteWithAuthor,
  type WeeklyReport,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/auth';
import { avisandoSeFalhar } from '@/lib/registro';
import { localDateKey } from '@/services/healthSync';

const reports = createWeeklyReportService(supabase);
const notes = createSpecialistNoteService(supabase);

/**
 * O relatório da semana que fechou (R1): no domingo, a que termina hoje.
 *
 * @example const { data: report } = useWeeklyReport(user.id);
 */
export function useWeeklyReport(studentId: string | null) {
  const today = localDateKey();
  const query = useQuery<WeeklyReport>({
    queryKey: ['weekly-report', studentId, today],
    enabled: Boolean(studentId),
    queryFn: () =>
      avisandoSeFalhar('checkin.weekly_report', () =>
        reports.fetchWeeklyReport(studentId as string, today)
      ),
  });
  return { ...query, today };
}

/**
 * O comentário do especialista na semana (R1, variante Aluno): a última nota
 * escrita nela. O Praticante não lê nota (CASL), e a busca nem sai.
 *
 * @example const { data: note } = useWeekNote(user.id, report);
 */
export function useWeekNote(studentId: string | null, report: WeeklyReport | undefined) {
  const canRead = useAuthStore((state) => state.abilities?.can('read', 'SpecialistNote') ?? false);
  return useQuery<SpecialistNoteWithAuthor | null>({
    queryKey: ['weekly-report-note', studentId, report?.weekStart],
    enabled: Boolean(studentId && report && canRead),
    queryFn: () => {
      const week = report as WeeklyReport;
      return avisandoSeFalhar('checkin.weekly_note', () =>
        notes.latestNoteInPeriod(
          studentId as string,
          brazilDayStart(week.weekStart),
          brazilDayStart(addDays(week.weekEnd, 1))
        )
      );
    },
  });
}
