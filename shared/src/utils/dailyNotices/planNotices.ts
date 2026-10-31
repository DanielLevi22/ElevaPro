import { addDays, weekdayFromMonday, weekdayOf } from "../dateOnly";
import { inQuietHours, MINUTES_PER_DAY, minutesOf, usualWorkoutMinutes } from "./clock";
import {
  BUSY_WEEK_AFTER_DAYS,
  CHECK_IN_TIME,
  COMEBACK_AFTER_DAYS,
  DAILY_LOG_TIME,
  HORIZON_DAYS,
  MEAL_DELAY_MINUTES,
  WEEKLY_REPORT_TIME,
  WORKOUT_DELAY_MINUTES,
} from "./constants";
import { detailedCopy, fixedCopy, hiddenCopy } from "./copy";
import { mealsOn, restingOn, workoutOn } from "./today";
import type {
  ActionableNoticeKind,
  FixedNoticeKind,
  NoticeKind,
  NoticePreferences,
  NoticeState,
  ScheduledNotice,
} from "./types";

interface Candidate {
  kind: NoticeKind;
  refId: string;
  name: string;
  minutes: number;
}

/** O que vale para a semana inteira, calculado uma vez. */
interface Plan {
  state: NoticeState;
  prefs: NoticePreferences;
  workoutAt: number;
  /** De quando contam os dias sem treino; nulo sem treino no plano. */
  anchor: string | null;
}

const SUNDAY = 0;
const DAYS_IN_WEEK = 7;
const at = (time: string) => minutesOf(time) ?? 0;
const isActionable = (kind: NoticeKind): kind is ActionableNoticeKind =>
  kind === "meal" || kind === "workout";

/**
 * Os avisos dos próximos 7 dias (#376, item G), dado o estado de hoje. Quem
 * chama cancela os anteriores e agenda estes; registrar uma refeição ou um
 * treino chama de novo, e o aviso do que foi feito some.
 *
 * Regras: refeição 1h30 depois do horário, se não marcada; treino 30 min
 * depois do horário de costume (ou do fixo), só em dia de treino e se ainda
 * não treinou; o relatório no domingo às 18h, o check-in pendente de manhã e
 * o lembrete das 20h, se ligado. Nada no silêncio, nada em Modo Descanso, e
 * sem o consentimento de saúde nada que dependa dele. Até o limite do dia,
 * os que não são refeição primeiro (o resto fica no "Falta hoje" do Início).
 *
 * @example
 * const avisos = planNotices(estadoDeHoje, preferencias);
 * avisos[0].title // "Almoço ainda não marcado"
 */
export function planNotices(state: NoticeState, prefs: NoticePreferences): ScheduledNotice[] {
  const plan: Plan = {
    state,
    prefs,
    workoutAt: workoutMinutes(state, prefs),
    anchor: reengagementAnchor(state),
  };
  return activeDays(plan).flatMap((day) => noticesOfDay(plan, day));
}

/** Os dias que avisam: fora da pausa, e até a pergunta do 7º dia (F5). */
function activeDays({ state, anchor }: Plan): string[] {
  const busyDay = anchor && addDays(anchor, BUSY_WEEK_AFTER_DAYS);
  return Array.from({ length: HORIZON_DAYS }, (_, offset) => addDays(state.today, offset))
    .filter((day) => !restingOn(state.rests, day))
    .filter((day) => !busyDay || day <= busyDay);
}

function noticesOfDay(plan: Plan, day: string): ScheduledNotice[] {
  const { state, prefs } = plan;
  const due = candidatesOf(plan, day)
    .filter((item) => item.minutes < MINUTES_PER_DAY)
    .filter((item) => day !== state.today || item.minutes > state.nowMinutes)
    .filter((item) => !inQuietHours(item.minutes, prefs.quietStart, prefs.quietEnd));
  return withinLimit(due, prefs.dailyLimit).map(toNoticeOn(day, prefs.hideDetails));
}

/**
 * Os mais importantes primeiro, até o limite: com seis refeições, as três
 * primeiras tomariam o limite e o treino nunca avisaria. Depois, na ordem do dia.
 */
function withinLimit(due: Candidate[], limit: number): Candidate[] {
  const priority = (item: Candidate) => (item.kind === "meal" || item.kind === "dailyLog" ? 1 : 0);
  return [...due]
    .sort((a, b) => priority(a) - priority(b) || a.minutes - b.minutes)
    .slice(0, limit)
    .sort((a, b) => a.minutes - b.minutes);
}

function candidatesOf(plan: Plan, day: string): Candidate[] {
  return [
    ...mealCandidates(plan, day),
    ...workoutCandidates(plan, day),
    ...fixedCandidates(plan, day),
  ];
}

/** Sem o consentimento de saúde, a refeição não avisa: o registro dela é Art. 11. */
function mealCandidates({ state, prefs }: Plan, day: string): Candidate[] {
  if (!prefs.meal || !state.healthConsent) return [];
  const logged = day === state.today ? state.loggedMealIds : [];
  return mealsOn(state.meals, day)
    .filter((meal) => !logged.includes(meal.id) && minutesOf(meal.time) !== null)
    .map((meal) => ({
      kind: "meal" as const,
      refId: meal.id,
      name: meal.name,
      minutes: at(meal.time) + MEAL_DELAY_MINUTES,
    }));
}

/** O treino do dia, ou o reengajamento no 3º e no 7º dia sem treino. */
function workoutCandidates({ state, prefs, workoutAt, anchor }: Plan, day: string): Candidate[] {
  if (!prefs.workout) return [];
  const comeback = reengagementOf(anchor, day);
  if (comeback) return [fixed(comeback, workoutAt)];
  const workout = workoutOn(state.workouts, day);
  if (!workout || (day === state.today && state.trainedToday)) return [];
  return [{ kind: "workout", refId: workout.id, name: workout.title, minutes: workoutAt }];
}

function fixedCandidates({ state, prefs }: Plan, day: string): Candidate[] {
  const candidates: Candidate[] = [];
  if (weekdayOf(day) === SUNDAY) candidates.push(fixed("weeklyReport", at(WEEKLY_REPORT_TIME)));
  if (state.checkInDue && inThisWeek(state.today, day)) {
    candidates.push(fixed("checkIn", at(CHECK_IN_TIME)));
  }
  if (prefs.dailyLog && state.healthConsent) candidates.push(fixed("dailyLog", at(DAILY_LOG_TIME)));
  return candidates;
}

const fixed = (kind: FixedNoticeKind, minutes: number): Candidate => ({
  kind,
  refId: kind,
  name: "",
  minutes,
});

/** O check-in desta semana: depois do domingo, a semana fecha e o estado muda. */
function inThisWeek(today: string, day: string): boolean {
  return day <= addDays(today, DAYS_IN_WEEK - 1 - weekdayFromMonday(today));
}

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
  const fixedTime = prefs.workoutMode === "fixed" ? minutesOf(prefs.workoutTime) : null;
  return (fixedTime ?? usualWorkoutMinutes(state.workoutStarts)) + WORKOUT_DELAY_MINUTES;
}

/**
 * O aviso agendável. Sem detalhes, a refeição e o treino dizem só quantas
 * pendências há até aquele aviso; os de texto fixo não têm detalhe a esconder.
 */
function toNoticeOn(day: string, hide: boolean) {
  let pending = 0;
  return (item: Candidate): ScheduledNotice => {
    const copy = !isActionable(item.kind)
      ? fixedCopy(item.kind)
      : hide
        ? hiddenCopy(++pending)
        : detailedCopy(item.kind, item.name);
    return {
      id: `notice-${day}-${item.kind}-${item.refId}`,
      kind: item.kind,
      refId: item.refId,
      date: day,
      minutes: item.minutes,
      ...copy,
    };
  };
}
