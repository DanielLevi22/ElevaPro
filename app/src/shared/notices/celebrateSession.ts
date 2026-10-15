import { createDailyNoticesService, restingNow, victoryCopy } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as Notifications from 'expo-notifications';
import { registrarFalha } from '@/lib/registro';
import { presentVictoryNotice } from '@/services/notificationService';
import { currentPreferences } from './noticePreferencesStore';

const notices = createDailyNoticesService(supabase);

/**
 * F1 · A vitória do treino salvo: o marco, a semana que fechou ou o recorde. Com
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
    const [state, totalWorkouts] = await Promise.all([
      notices.fetchNoticeState(studentId, new Date()),
      notices.countWorkouts(studentId),
    ]);
    // Em Modo Descanso nada avisa, nem a vitória (#376, A8).
    if (restingNow(state.rests, state.today)) return;
    const copy = victoryCopy(
      {
        record: record && { name: record.nome, text: record.texto },
        weekDone: state.workoutsThisWeek,
        weekTarget: state.workouts.length || null,
        totalWorkouts,
      },
      currentPreferences().hideDetails
    );
    if (copy) await presentVictoryNotice(copy);
  } catch {
    // A vitória é bônus: sem rede, o resumo na tela já comemora.
    registrarFalha('notices.victory');
  }
}
