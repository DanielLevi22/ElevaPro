// Os avisos do dia (#376, item G): o que avisar, quando e com que texto.
export { inQuietHours, minutesOf, timeOf, usualWorkoutMinutes } from "./clock";
export {
  DEFAULT_PREFERENCES,
  LEARNING_WINDOW_DAYS,
  MIN_STARTS_TO_LEARN,
  WORKOUT_DELAY_MINUTES,
} from "./constants";
export { dayNameOf, planNotices } from "./planNotices";
export type {
  NoticeKind,
  NoticeMeal,
  NoticePreferences,
  NoticeState,
  NoticeWorkout,
  ScheduledNotice,
} from "./types";
