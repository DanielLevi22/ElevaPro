import {
  buildPeriodizationSheet,
  createWorkoutsService,
  periodizationObjectiveLabel,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import type { ProtocolHeader } from '@/shared/pdf/protocolPaper';
import { useSharePdf } from '@/shared/pdf/useSharePdf';
import { periodRange, sharePlan } from '../services/workoutPdf';

const workoutsService = createWorkoutsService(supabase);

type PlanPeople = Pick<ProtocolHeader, 'student' | 'specialist'>;

/**
 * Exporta o plano completo em PDF — periodização, fases, treinos, exercícios e
 * séries — pela folha de compartilhar. Busca tudo só na hora de exportar: a
 * tela das fases não carrega os treinos de todas elas.
 *
 * @example const { exportPdf, generating } = useExportPlan(periodization.id, { student, specialist });
 */
export function useExportPlan(periodizationId: string, people: PlanPeople) {
  return useSharePdf(
    () => fetchAndShare(periodizationId, people),
    'Não consegui gerar o PDF do plano. Tente de novo.'
  );
}

async function fetchAndShare(periodizationId: string, people: PlanPeople): Promise<boolean> {
  try {
    const full = await workoutsService.fetchFullPeriodization(periodizationId);
    if (!full) return false;
    const { periodization } = full;
    const plan = buildPeriodizationSheet({
      ...full,
      // O objetivo pelo rótulo da tela, não pelo código gravado.
      periodization: {
        ...periodization,
        objective: periodizationObjectiveLabel(periodization.objective),
      },
    });
    const validity = periodRange(periodization.start_date, periodization.end_date);
    const header = { document: 'Plano de treino completo', ...people, validity };
    return sharePlan(plan, header, new Date().toLocaleString('pt-BR'));
  } catch {
    // A busca falhou antes do PDF: sem detalhe no log, como o compartilhar.
    return false;
  }
}
