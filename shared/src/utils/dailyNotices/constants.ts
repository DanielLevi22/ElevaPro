import type { NoticePreferences } from "./types";

/**
 * Os horários dos avisos do dia (#376, item G). Provisórios: saem do desenho
 * e mudam com o que a métrica de avisos desligados mostrar.
 */

/** A refeição avisa 1h30 depois do horário dela, se não foi marcada. */
export const MEAL_DELAY_MINUTES = 90;
/** O treino avisa 30 min depois do horário de costume. */
export const WORKOUT_DELAY_MINUTES = 30;
/** Sem histórico para aprender, o treino é às 18:00. */
export const DEFAULT_WORKOUT_TIME = "18:00";
/** As semanas de onde sai o horário de costume (F2). */
export const LEARNING_WINDOW_DAYS = 28;
/** Menos inícios que isto não é costume: vale o horário padrão. */
export const MIN_STARTS_TO_LEARN = 3;
/** Os dias agendados de uma vez: quem some recebe uma semana e depois silêncio. */
export const HORIZON_DAYS = 7;

export const DEFAULT_PREFERENCES: NoticePreferences = {
  meal: true,
  workout: true,
  workoutMode: "learned",
  workoutTime: DEFAULT_WORKOUT_TIME,
  quietStart: "22:00",
  quietEnd: "07:00",
  dailyLimit: 3,
  // Decidido no #376: a tela bloqueada não mostra o plano a quem pega o celular.
  hideDetails: true,
};
