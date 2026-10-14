import {
  createDailyNoticesService,
  dayNameOf,
  minutesOf,
  type NoticeState,
  weekdayOf,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import { applyNoticeChoices } from './applyNoticeChoices';
import { useNoticeChoicesStore } from './noticeChoicesStore';

const notices = createDailyNoticesService(supabase);

export interface ChecklistItem {
  kind: 'meal' | 'workout';
  id: string;
  name: string;
  /** "HH:MM"; nulo no treino. */
  time: string | null;
  done: boolean;
}

export const TODAY_CHECKLIST_KEY = 'today-checklist';

/**
 * E4 · Falta hoje: as refeições e o treino de hoje, feitos ou não, a partir do
 * mesmo estado que os avisos usam.
 *
 * @example const { data: itens } = useTodayChecklist(user.id);
 */
export function useTodayChecklist(studentId: string | null) {
  return useQuery<ChecklistItem[]>({
    queryKey: [TODAY_CHECKLIST_KEY, studentId],
    enabled: Boolean(studentId),
    queryFn: () =>
      avisandoSeFalhar('notices.checklist', async () => {
        const state = await notices.fetchNoticeState(studentId ?? '', new Date());
        return checklistOf(applyNoticeChoices(state, useNoticeChoicesStore.getState()));
      }),
  });
}

/** As refeições cujo horário já passou, na ordem, e o treino, se hoje é dia dele. */
export function checklistOf(state: NoticeState): ChecklistItem[] {
  const weekday = weekdayOf(state.today);
  const meals = state.meals
    .filter((meal) => meal.dayOfWeek === null || meal.dayOfWeek === weekday)
    // A refeição que ainda não chegou não falta.
    .filter((meal) => (minutesOf(meal.time) ?? 0) <= state.nowMinutes)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((meal) => ({
      kind: 'meal' as const,
      id: meal.id,
      name: meal.name,
      time: meal.time,
      done: state.loggedMealIds.includes(meal.id),
    }));
  const workout = state.workouts.find((item) => item.day === dayNameOf(state.today));
  if (!workout) return meals;
  const item = { kind: 'workout' as const, id: workout.id, name: workout.title, time: null };
  return [{ ...item, done: state.trainedToday }, ...meals];
}
