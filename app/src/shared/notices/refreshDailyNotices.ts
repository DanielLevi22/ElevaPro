import {
  createDailyNoticesService,
  createHidratacao,
  type NoticeState,
  planNotices,
  type ScheduledNotice,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import * as Notifications from 'expo-notifications';
import { avisandoSeFalhar } from '@/lib/registro';
import { localDateKey } from '@/services/healthSync';
import { scheduleDailyNotices } from '@/services/notificationService';
import { buildTodaySnapshot, updateTodayWidget } from '@/shared/widget';
import { applyNoticeChoices } from './applyNoticeChoices';
import { type TrackedNotice, useNoticeChoicesStore } from './noticeChoicesStore';
import { currentPreferences } from './noticePreferencesStore';

const notices = createDailyNoticesService(supabase);
const water = createHidratacao(supabase);

/**
 * Agenda de novo os avisos dos próximos 7 dias e redesenha o widget (F7) a
 * partir do estado de agora. Roda ao abrir o app, ao mudar as preferências, ao
 * registrar uma refeição ou um treino e ao responder um aviso: o que foi feito
 * deixa de avisar.
 *
 * Antes de trocar, conta os avisos que tocaram sem resposta (E6). Sem
 * permissão de aviso, só o widget: pedir é da tela de Avisos, não daqui.
 *
 * @example await refreshDailyNotices(user.id);
 */
export async function refreshDailyNotices(studentId: string): Promise<void> {
  try {
    await avisandoSeFalhar('notices.refresh', async () => {
      const now = new Date();
      const choices = useNoticeChoicesStore.getState();
      const [fetched, waterMl, permission] = await Promise.all([
        notices.fetchNoticeState(studentId, now),
        water.lerDia(studentId, localDateKey(now)),
        Notifications.getPermissionsAsync(),
      ]);
      const state = applyNoticeChoices(fetched, choices);
      const preferences = currentPreferences();
      await updateTodayWidget(buildTodaySnapshot(state, waterMl, preferences.hideDetails));
      if (permission.status !== 'granted') return;
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
