import {
  createDailyNoticesService,
  type NoticeState,
  planNotices,
  type ScheduledNotice,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as Notifications from 'expo-notifications';
import { avisandoSeFalhar } from '@/lib/registro';
import { scheduleDailyNotices } from '@/services/notificationService';
import { applyNoticeChoices } from './applyNoticeChoices';
import { type TrackedNotice, useNoticeChoicesStore } from './noticeChoicesStore';
import { currentPreferences } from './noticePreferencesStore';

const notices = createDailyNoticesService(supabase);

/**
 * Agenda de novo os avisos dos próximos 7 dias a partir do estado de agora.
 * Roda ao abrir o app, ao mudar as preferências, ao registrar uma refeição ou
 * um treino e ao responder um aviso: o que foi feito deixa de avisar.
 *
 * Antes de trocar, conta os avisos que tocaram sem resposta (E6).
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
      const now = new Date();
      const choices = useNoticeChoicesStore.getState();
      const state = applyNoticeChoices(await notices.fetchNoticeState(studentId, now), choices);
      const preferences = currentPreferences();
      const planned = planNotices(state, preferences);
      // O reengajamento toca uma vez e não volta: não tem o que ignorar três vezes.
      const tracked = planned.filter(
        (notice) => notice.kind === 'meal' || notice.kind === 'workout'
      );
      choices.settle(now.getTime(), doneToday(state), tracked.map(trackOf(state)));
      await scheduleDailyNotices(planned, { withActions: !preferences.hideDetails });
    });
  } catch {
    // Já registrado. Sem rede, os avisos agendados antes seguem valendo.
  }
}

function doneToday(state: NoticeState): string[] {
  const meals = state.loggedMealIds.map((id) => `meal:${id}`);
  return state.trainedToday ? [...meals, ...state.workouts.map((w) => `workout:${w.id}`)] : meals;
}

function trackOf(state: NoticeState) {
  return (notice: ScheduledNotice): TrackedNotice => {
    const [year, month, day] = notice.date.split('-').map(Number);
    const meal = state.meals.find((item) => item.id === notice.refId);
    return {
      id: notice.id,
      refKey: `${notice.kind}:${notice.refId}`,
      label: notice.kind === 'meal' ? (meal?.name ?? 'refeição') : 'treino',
      at: new Date(year, month - 1, day, 0, notice.minutes).getTime(),
    };
  };
}
