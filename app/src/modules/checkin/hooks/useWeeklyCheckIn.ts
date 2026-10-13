import {
  type CheckInLogging,
  type CheckInProposal,
  type CheckInSummary,
  createMeasurementService,
  createWeeklyCheckInService,
  type Recalibration,
  type WeeklyCheckIn,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';

const checkIns = createWeeklyCheckInService(supabase);
const measurements = createMeasurementService(supabase);

const SUMMARY_KEY = 'weekly-check-in';
const PROPOSAL_KEY = 'weekly-check-in-proposal';

/**
 * O estado da semana para a tela inicial e para a tela de ajuste.
 *
 * @example const { data: semana } = useCheckInSummary(user.id);
 */
export function useCheckInSummary(studentId: string | null) {
  return useQuery<CheckInSummary>({
    queryKey: [SUMMARY_KEY, studentId],
    enabled: Boolean(studentId),
    queryFn: () => avisandoSeFalhar('checkin.summary', () => checkIns.summary(studentId as string)),
  });
}

/**
 * Se a pessoa tem especialista ativo: aí o check-in não pede peso (ADR-0030).
 *
 * @example const { data: temEspecialista } = useHasSpecialist(user.id);
 */
export function useHasSpecialist(studentId: string | null) {
  return useQuery({
    queryKey: ['has-active-specialist', studentId],
    enabled: Boolean(studentId),
    queryFn: () =>
      avisandoSeFalhar('checkin.especialista', () =>
        measurements.hasActiveSpecialist(studentId as string)
      ),
  });
}

/**
 * O ajuste proposto para o check-in da semana (A5). A conta é código, no
 * aparelho; o banco só confere o freio ao aprovar.
 *
 * @example const proposta = useCheckInProposal(user.id, semana.checkIn);
 */
export function useCheckInProposal(studentId: string | null, checkIn: WeeklyCheckIn | null) {
  return useQuery<CheckInProposal>({
    queryKey: [PROPOSAL_KEY, checkIn?.id, checkIn?.logging, checkIn?.assessment_id],
    enabled: Boolean(studentId && checkIn),
    queryFn: () => checkIns.proposal(studentId as string, checkIn as WeeklyCheckIn),
  });
}

/**
 * Enviar o check-in e decidir o ajuste. Depois de cada um, o estado da semana
 * é relido: é ele que muda o cartão da tela inicial.
 *
 * @example const { submit, approve, keep } = useCheckInActions();
 */
export function useCheckInActions() {
  const queryClient = useQueryClient();
  const settle = () => queryClient.invalidateQueries({ queryKey: [SUMMARY_KEY] });

  const submit = useMutation({
    mutationFn: (input: { logging: CheckInLogging; weightKg: number | null }) =>
      checkIns.submit(input),
    onSuccess: settle,
  });
  const approve = useMutation({
    mutationFn: ({
      checkInId,
      recalibration,
    }: {
      checkInId: string;
      recalibration: Recalibration;
    }) => checkIns.approve(checkInId, recalibration),
    onSuccess: settle,
  });
  const keep = useMutation({
    mutationFn: (checkInId: string) => checkIns.keep(checkInId),
    onSuccess: settle,
  });
  return { submit, approve, keep };
}
