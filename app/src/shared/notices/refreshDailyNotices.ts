import {
  createDailyNoticesService,
  createHidratacao,
  localInstant,
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
import {
  type NoticeRefKey,
  refKeyOf,
  type TrackedNotice,
  useNoticeChoicesStore,
} from './noticeChoicesStore';
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
      const [fetched, permission] = await Promise.all([
        notices.fetchNoticeState(studentId, now),
        Notifications.getPermissionsAsync(),
      ]);
      // A água é dado de saúde: sem o consentimento, nem é lida (#344).
      const waterMl = fetched.healthConsent
        ? await water.lerDia(studentId, localDateKey(now))
        : null;
      const state = applyNoticeChoices(fetched, choices);
      const preferences = currentPreferences();
      await updateTodayWidget(buildTodaySnapshot(state, waterMl, preferences.hideDetails));
      if (permission.status !== 'granted') return;
      const planned = planNotices(state, preferences);
      // Os de texto fixo tocam e não voltam: não têm o que ignorar três vezes.
      const tracked = planned.flatMap(trackOf(state));
      choices.settle(now.getTime(), doneToday(state), tracked);
      await scheduleDailyNotices(planned, { withActions: !preferences.hideDetails });
    });
  } catch {
    // Já registrado. Sem rede, os avisos agendados antes seguem valendo.
  }
}

function doneToday(state: NoticeState): NoticeRefKey[] {
  const meals = state.loggedMealIds.map((id) => refKeyOf('meal', id));
  if (!state.trainedToday) return meals;
  return [...meals, ...state.workouts.map((workout) => refKeyOf('workout', workout.id))];
}

/** O aviso com ação, lembrado para a conta do ignorado (E6); os outros, nada. */
function trackOf(state: NoticeState) {
  return (notice: ScheduledNotice): TrackedNotice[] => {
    if (notice.kind !== 'meal' && notice.kind !== 'workout') return [];
    const meal = state.meals.find((item) => item.id === notice.refId);
    return [
      {
        id: notice.id,
        refKey: refKeyOf(notice.kind, notice.refId),
        label: notice.kind === 'meal' ? (meal?.name ?? 'refeição') : 'treino',
        at: localInstant(notice.date, notice.minutes).getTime(),
      },
    ];
  };
}
