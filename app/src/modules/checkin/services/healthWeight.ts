import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { readWeekAverageWeight } from '@/shared/wearable';

const health = createHealthService(supabase);

/** Segunda-feira, meia-noite local: a semana do check-in. */
function weekStart(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/**
 * A média da semana do app Saúde para o check-in (F9), só com o consentimento
 * de saúde vigente. Sem ele, nem lê: ler para descartar ainda é tratamento
 * (Art. 11; LGPD_COMPLIANCE §2.3). Falha de rede no consentimento fecha.
 *
 * @example const kg = await weekWeightIfConsented(user.id, new Date());
 */
export async function weekWeightIfConsented(studentId: string, now: Date): Promise<number | null> {
  const consented = await health.hasCollectionConsent(studentId).catch(() => false);
  if (!consented) return null;
  return readWeekAverageWeight(weekStart(now), now);
}
