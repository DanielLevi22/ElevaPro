import type { DayOfWeek } from "../../types/workouts.types";
import type { RestPeriod } from "../restMode";

/** Os avisos que pedem uma ação: têm botões e contam como pendência (E2, E3). */
export type ActionableNoticeKind = "meal" | "workout";

/**
 * Os avisos de texto fixo, sem dado de saúde: o reengajamento (F4, F5), o
 * lembrete das 20h (A5b), o relatório de domingo (R0) e o check-in da semana.
 */
export type FixedNoticeKind = "comeback" | "busyWeek" | "dailyLog" | "weeklyReport" | "checkIn";

export type NoticeKind = ActionableNoticeKind | FixedNoticeKind;

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
  /** O lembrete das 20h para registrar o dia (A5b): só quem pediu. */
  dailyLog: boolean;
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
  /** O último dia com treino nas 4 semanas; nulo sem nenhum. */
  lastWorkoutDate: string | null;
  /** Os treinos feitos desde segunda. */
  workoutsThisWeek: number;
  /** O check-in desta semana ainda não foi feito. */
  checkInDue: boolean;
  /**
   * O consentimento de saúde vigente. Sem ele, nada que dependa de dado de
   * saúde avisa: nem a refeição, nem o lembrete de registrar o dia (#344).
   */
  healthConsent: boolean;
}

export interface ScheduledNotice {
  /** Estável por dia e item: agendar de novo troca o anterior. */
  id: string;
  kind: NoticeKind;
  /** A refeição ou o treino que o toque abre; nos de texto fixo, o próprio tipo. */
  refId: string;
  date: string;
  minutes: number;
  title: string;
  body: string;
}
