import { createDailyNoticesService, planNotices } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as Notifications from 'expo-notifications';
import { avisandoSeFalhar } from '@/lib/registro';
import { scheduleDailyNotices } from '@/services/notificationService';
import { currentPreferences } from './noticePreferencesStore';

const notices = createDailyNoticesService(supabase);

/**
 * Agenda de novo os avisos dos próximos 7 dias a partir do estado de agora.
 * Roda ao abrir o app, ao mudar as preferências e ao registrar uma refeição:
 * o que foi feito deixa de avisar.
 *
 * Sem permissão, não faz nada: pedir é da tela de Avisos, não daqui.
 *
 * @example await refreshDailyNotices(user.id);
 */
export async function refreshDailyNotices(studentId: string): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  try {
    await avisandoSeFalhar('notices.refresh', async () => {
      const state = await notices.fetchNoticeState(studentId, new Date());
      await scheduleDailyNotices(planNotices(state, currentPreferences()));
    });
  } catch {
    // Já registrado. Sem rede, os avisos agendados antes seguem valendo.
  }
}
