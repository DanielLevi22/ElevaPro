import type { DayOfWeek } from "../../types/workouts.types";
import type { RestPeriod } from "../restMode";

export type NoticeKind = "meal" | "workout";

/** As escolhas da pessoa em Avisos (E5). Ficam no aparelho, como os avisos. */
export interface NoticePreferences {
  meal: boolean;
  workout: boolean;
  /** Aprendido pela mediana dos inícios, ou o horário fixo abaixo. */
  workoutMode: "learned" | "fixed";
  /** "HH:MM". */
  workoutTime: string;
  quietStart: string;
  quietEnd: string;
  dailyLimit: number;
  /** Na tela bloqueada, só "Você tem 2 pendências de hoje" (F6). */
  hideDetails: boolean;
}

export interface NoticeMeal {
  id: string;
  name: string;
  /** "HH:MM". */
  time: string;
  /** 0 (domingo) a 6; nulo é todo dia, como no plano de dieta único. */
  dayOfWeek: number | null;
}

export interface NoticeWorkout {
  id: string;
  title: string;
  day: DayOfWeek;
}

/** O estado do dia que decide o que avisar. */
export interface NoticeState {
  today: string;
  /** Minutos desde a meia-noite, no fuso do aparelho. */
  nowMinutes: number;
  meals: readonly NoticeMeal[];
  loggedMealIds: readonly string[];
  workouts: readonly NoticeWorkout[];
  trainedToday: boolean;
  /** Os inícios de treino das últimas 4 semanas, em minutos desde a meia-noite. */
  workoutStarts: readonly number[];
  rests: readonly RestPeriod[];
}

export interface ScheduledNotice {
  /** Estável por dia e item: agendar de novo troca o anterior. */
  id: string;
  kind: NoticeKind;
  /** A refeição ou o treino que o toque abre. */
  refId: string;
  date: string;
  minutes: number;
  title: string;
  body: string;
}
