// Os avisos do dia (#376, item G): o que avisar, quando e com que texto.
export { inQuietHours, minutesOf, timeOf, usualWorkoutMinutes } from "./clock";
export { DEFAULT_PREFERENCES, LEARNING_WINDOW_DAYS } from "./constants";
export { planNotices } from "./planNotices";
export type {
  NoticeKind,
  NoticeMeal,
  NoticePreferences,
  NoticeState,
  NoticeWorkout,
  ScheduledNotice,
} from "./types";
