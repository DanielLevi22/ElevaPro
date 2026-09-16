import {
  addDays,
  createProgressService,
  createSpecialistNoteService,
  type PeriodReport,
  type SpecialistNoteWithAuthor,
  summarizePeriod,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/auth';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { avisandoSeFalhar } from '@/lib/registro';
import { useMeasurements } from './useMeasurements';
import { useTrainingSets } from './useTrainingSets';

const progress = createProgressService(supabase);
const notes = createSpecialistNoteService(supabase);

/** A janela do relatório: os últimos 90 dias, contando hoje. */
export const REPORT_DAYS = 90;

export interface PeriodReportState {
  report: PeriodReport | null;
  /** Nome da periodização ativa, quando existe. */
  periodization: string | null;
  /** O especialista que acompanha; nulo para o Praticante. */
  specialist: string | null;
  /** A última nota escrita no período; nula para quem não lê nota. */
  note: SpecialistNoteWithAuthor | null;
  loading: boolean;
}

/**
 * O relatório do período (issue #312, tela 8): 90 dias de treino, aderência,
 * cardio e medida, mais a última nota do especialista.
 *
 * As contas ficam no `shared`: o hub e o relatório não podem divergir num número
 * que o aluno vê nos dois lugares.
 *
 * @example const { report, note } = usePeriodReport(user.id);
 */
export function usePeriodReport(studentId: string): PeriodReportState {
  const abilities = useAuthStore((estado) => estado.abilities);
  const { days, today, loading: loadingDays } = useDailyActivity(studentId);
  const { sets, loading: loadingSets } = useTrainingSets(studentId, REPORT_DAYS);
  const { all: measurements, loading: loadingMeasures } = useMeasurements(studentId);
  const from = addDays(today, -(REPORT_DAYS - 1));

  const { data: context, isLoading: loadingContext } = useQuery({
    queryKey: ['periodContext', studentId, from, today],
    queryFn: () =>
      avisandoSeFalhar('progress.read_period_context', () =>
        progress.getPeriodContext(studentId, from, today)
      ),
  });

  // O Praticante não tem especialista, e nem lê nota (CASL): sem isto, a tela
  // pediria ao banco uma lista que a RLS já devolve vazia para ele.
  const canReadNote = abilities?.can('read', 'SpecialistNote') ?? false;
  const { data: note, isLoading: loadingNote } = useQuery({
    queryKey: ['periodNote', studentId, from, today],
    enabled: canReadNote,
    queryFn: () =>
      // O fim do período é agora, e não `${today}T23:59:59Z`: em fuso negativo o
      // dia local termina depois da meia-noite UTC, e a nota escrita à noite
      // ficava de fora do próprio dia em que foi escrita.
      avisandoSeFalhar('progress.read_period_note', () =>
        notes.latestNoteInPeriod(studentId, from, new Date().toISOString())
      ),
  });

  const loading = loadingDays || loadingSets || loadingMeasures || loadingContext;
  return {
    report: loading
      ? null
      : summarizePeriod({
          from,
          to: today,
          today,
          days,
          sets,
          measurements,
          cardioSessions: context?.cardioSessions ?? 0,
        }),
    periodization: context?.periodization ?? null,
    specialist: context?.specialist ?? null,
    note: note ?? null,
    loading: loading || (canReadNote && loadingNote),
  };
}
