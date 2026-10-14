import type { DayOfWeek } from "../../types/workouts.types";
import { addDays, weekdayOf } from "../dateOnly";
import type { RestPeriod } from "../restMode";
import { inQuietHours, MINUTES_PER_DAY, minutesOf, usualWorkoutMinutes } from "./clock";
import {
  BUSY_WEEK_AFTER_DAYS,
  COMEBACK_AFTER_DAYS,
  HORIZON_DAYS,
  MEAL_DELAY_MINUTES,
  WORKOUT_DELAY_MINUTES,
} from "./constants";
import { detailedCopy, hiddenCopy, reengagementCopy } from "./copy";
import type { NoticeKind, NoticePreferences, NoticeState, ScheduledNotice } from "./types";

const DAY_NAMES: readonly DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * O dia da semana da data como os treinos gravam.
 *
 * @example dayNameOf("2026-10-14") // "wednesday"
 */
export function dayNameOf(date: string): DayOfWeek {
  return DAY_NAMES[weekdayOf(date)];
}

interface Candidate {
  kind: NoticeKind;
  refId: string;
  name: string;
  minutes: number;
}

/**
 * Os avisos dos próximos 7 dias (#376, item G), dado o estado de hoje. Quem
 * chama cancela os anteriores e agenda estes; registrar uma refeição ou um
 * treino chama de novo, e o aviso do que foi feito some.
 *
 * Regras: refeição 1h30 depois do horário, se não marcada; treino 30 min
 * depois do horário de costume (ou do fixo), só em dia de treino e se ainda
 * não treinou; nada no silêncio, nada em Modo Descanso; até o limite do dia,
 * o treino primeiro e depois as refeições mais cedo (o resto fica no "Falta
 * hoje" do Início).
 *
 * @example
 * const avisos = planNotices(estadoDeHoje, preferencias);
 * avisos[0].title // "Almoço ainda não marcado"
 */
export function planNotices(state: NoticeState, prefs: NoticePreferences): ScheduledNotice[] {
  const workoutAt = workoutMinutes(state, prefs);
  const anchor = reengagementAnchor(state);
  const busyDay = anchor && addDays(anchor, BUSY_WEEK_AFTER_DAYS);
  return (
    Array.from({ length: HORIZON_DAYS }, (_, offset) => addDays(state.today, offset))
      .filter((day) => !restingOn(state.rests, day))
      // Depois da pergunta do 7º dia, silêncio até a pessoa abrir o app (F5).
      .filter((day) => !busyDay || day <= busyDay)
      .flatMap((day) => {
        const due = candidatesOf(state, prefs, day, workoutAt)
          .filter((item) => item.minutes < MINUTES_PER_DAY)
          .filter((item) => day !== state.today || item.minutes > state.nowMinutes)
          .filter((item) => !inQuietHours(item.minutes, prefs.quietStart, prefs.quietEnd))
          // O treino entra antes: com seis refeições, as três primeiras tomariam o
          // limite e o treino nunca avisaria.
          .sort((a, b) => priority(a) - priority(b) || a.minutes - b.minutes)
          .slice(0, prefs.dailyLimit)
          .sort((a, b) => a.minutes - b.minutes);
        return due.map((item, index) => toNotice(item, day, index + 1, prefs.hideDetails));
      })
  );
}

function candidatesOf(
  state: NoticeState,
  prefs: NoticePreferences,
  day: string,
  workoutAt: number,
): Candidate[] {
  const isToday = day === state.today;
  const meals = prefs.meal
    ? state.meals
        .filter((meal) => meal.dayOfWeek === null || meal.dayOfWeek === weekdayOf(day))
        .filter((meal) => !(isToday && state.loggedMealIds.includes(meal.id)))
        .flatMap((meal): Candidate[] => {
          const at = minutesOf(meal.time);
          if (at === null) return [];
          return [
            { kind: "meal", refId: meal.id, name: meal.name, minutes: at + MEAL_DELAY_MINUTES },
          ];
        })
    : [];
  const comeback = reengagementOf(reengagementAnchor(state), day);
  if (prefs.workout && comeback) {
    return [...meals, { kind: comeback, refId: comeback, name: "", minutes: workoutAt }];
  }
  const workout = state.workouts.find((item) => item.day === dayNameOf(day));
  if (!prefs.workout || !workout || (isToday && state.trainedToday)) return meals;
  return [
    ...meals,
    { kind: "workout", refId: workout.id, name: workout.title, minutes: workoutAt },
  ];
}

const priority = (item: Candidate) => (item.kind === "meal" ? 1 : 0);

/**
 * De quando contam os dias sem treino: do último treino, enquanto a pergunta
 * do 7º dia não passou. Passada, abrir o app (que é quando isto roda) acaba
 * com o silêncio, e a conta recomeça de hoje. Sem treino no plano, não há o
 * que lembrar.
 */
function reengagementAnchor(state: NoticeState): string | null {
  if (state.workouts.length === 0) return null;
  const last = state.lastWorkoutDate;
  if (last && addDays(last, BUSY_WEEK_AFTER_DAYS) >= state.today) return last;
  return state.today;
}

/** O 3º e o 7º dia sem treino (F4, F5), contados da âncora. */
function reengagementOf(anchor: string | null, day: string): "comeback" | "busyWeek" | null {
  if (!anchor) return null;
  if (day === addDays(anchor, COMEBACK_AFTER_DAYS)) return "comeback";
  if (day === addDays(anchor, BUSY_WEEK_AFTER_DAYS)) return "busyWeek";
  return null;
}

function workoutMinutes(state: NoticeState, prefs: NoticePreferences): number {
  const fixed = prefs.workoutMode === "fixed" ? minutesOf(prefs.workoutTime) : null;
  return (fixed ?? usualWorkoutMinutes(state.workoutStarts)) + WORKOUT_DELAY_MINUTES;
}

/** A pausa vale do início até a volta, ou até o fim previsto; sem os dois, sem fim. */
function restingOn(rests: readonly RestPeriod[], day: string): boolean {
  return rests.some(
    (rest) =>
      rest.starts_on <= day &&
      (rest.ended_on === null || day < rest.ended_on) &&
      (rest.planned_until === null || day <= rest.planned_until),
  );
}

function toNotice(item: Candidate, day: string, pending: number, hide: boolean): ScheduledNotice {
  const copy =
    item.kind === "comeback" || item.kind === "busyWeek"
      ? reengagementCopy(item.kind)
      : hide
        ? hiddenCopy(pending)
        : detailedCopy(item.kind, item.name);
  return {
    id: `notice-${day}-${item.kind}-${item.refId}`,
    kind: item.kind,
    refId: item.refId,
    date: day,
    minutes: item.minutes,
    ...copy,
  };
}
