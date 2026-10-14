import { createDailyNoticesService, victoryCopy } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as Notifications from 'expo-notifications';
import { registrarFalha } from '@/lib/registro';
import { presentVictoryNotice } from '@/services/notificationService';
import { currentPreferences } from './noticePreferencesStore';

const notices = createDailyNoticesService(supabase);

/**
 * F1 · A vitória do treino salvo: a semana que fechou ou o recorde. Com
 * detalhes escondidos, o texto não diz o exercício nem a carga.
 *
 * @example await celebrateSession(user.id, evolucoes[0] ?? null);
 */
export async function celebrateSession(
  studentId: string,
  record: { nome: string; texto: string } | null
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const state = await notices.fetchNoticeState(studentId, new Date());
    const copy = victoryCopy(
      {
        record: record && { name: record.nome, text: record.texto },
        weekDone: state.workoutsThisWeek,
        weekTarget: state.workouts.length || null,
      },
      currentPreferences().hideDetails
    );
    if (copy) await presentVictoryNotice(copy);
  } catch {
    // A vitória é bônus: sem rede, o resumo na tela já comemora.
    registrarFalha('notices.victory');
  }
}
