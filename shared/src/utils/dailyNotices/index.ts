// Os avisos do dia (#376, item G): o que avisar, quando e com que texto.
export { inQuietHours, localInstant, minutesOf, timeOf, usualWorkoutMinutes } from "./clock";
export {
  DEFAULT_PREFERENCES,
  LEARNING_WINDOW_DAYS,
  MIN_STARTS_TO_LEARN,
  WORKOUT_DELAY_MINUTES,
} from "./constants";
export {
  type NoticeCopy,
  pendingTitle,
  type VictoryInput,
  victoryCopy,
  WORKOUT_MILESTONES,
} from "./copy";
export { planNotices } from "./planNotices";
export { dayNameOf, mealsOn, restingOn, workoutOn } from "./today";
export type {
  ActionableNoticeKind,
  FixedNoticeKind,
  NoticeKind,
  NoticeMeal,
  NoticePreferences,
  NoticeState,
  NoticeWorkout,
  ScheduledNotice,
} from "./types";
