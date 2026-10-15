import { type ActionableNoticeKind, addDays, createNutritionService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import type { Href } from 'expo-router';
import { ROUTES } from '@/navigation/types';
import { NOTICE_ACTIONS } from '@/services/notificationService';
import { useNoticeChoicesStore } from './noticeChoicesStore';
import { refreshDailyNotices } from './refreshDailyNotices';

const nutrition = createNutritionService(supabase);

/** O que o aviso carrega em `data` (ver `scheduleDailyNotices`). */
export interface NoticeData {
  noticeKind: ActionableNoticeKind;
  refId: string;
  date: string;
}

/** Para onde a ação leva; nulo fica onde está. */
type ActionRoute = Href | null;

/**
 * Responde um botão do aviso (E2, E3). Marca a refeição, pula, move o treino
 * para amanhã ou abre a tela certa, e agenda de novo.
 *
 * @example const rota = await handleNoticeAction(studentId, 'meal-done', dados);
 */
export async function handleNoticeAction(
  studentId: string,
  action: string,
  notice: NoticeData
): Promise<ActionRoute> {
  const route = await applyAction(studentId, action, notice);
  // Em segundo plano: reagendar a semana leva segundos, e a tela não espera.
  void refreshDailyNotices(studentId);
  return route;
}

async function applyAction(
  studentId: string,
  action: string,
  notice: NoticeData
): Promise<ActionRoute> {
  const choices = useNoticeChoicesStore.getState();
  switch (action) {
    case NOTICE_ACTIONS.mealDone:
      await markMealDone(studentId, notice);
      return null;
    case NOTICE_ACTIONS.mealOther:
      return ROUTES.TABS.NUTRITION;
    case NOTICE_ACTIONS.mealSkip:
      choices.skipMeal(notice.date, notice.refId);
      return null;
    case NOTICE_ACTIONS.workoutStart:
      return ROUTES.WORKOUTS.EXECUTE(notice.refId);
    case NOTICE_ACTIONS.workoutShort:
      return ROUTES.WORKOUTS.EXECUTE_SHORT(notice.refId);
    case NOTICE_ACTIONS.workoutTomorrow:
      choices.moveWorkout(notice.date, {
        date: addDays(notice.date, 1),
        id: notice.refId,
      });
      return null;
    case NOTICE_ACTIONS.workoutSkip:
      choices.skipWorkout(notice.date);
      return null;
    default:
      return null;
  }
}

/** "Comi o do plano": o mesmo registro do toque na refeição, na dieta ativa. */
async function markMealDone(studentId: string, notice: NoticeData): Promise<void> {
  const plan = await nutrition.fetchActiveDietPlan(studentId);
  if (!plan) return;
  await nutrition.toggleMealLog({
    student_id: studentId,
    diet_plan_id: plan.id,
    diet_meal_id: notice.refId,
    logged_date: notice.date,
    completed: true,
  });
}

/**
 * Os dados do aviso, se for um aviso do dia.
 *
 * @example const dados = noticeDataOf(response.notification.request.content.data);
 */
export function noticeDataOf(data: Record<string, unknown> | undefined): NoticeData | null {
  if (data?.kind !== 'daily-notice') return null;
  const { noticeKind, refId, date } = data;
  if ((noticeKind !== 'meal' && noticeKind !== 'workout') || typeof refId !== 'string') return null;
  if (typeof date !== 'string') return null;
  return { noticeKind, refId, date };
}
