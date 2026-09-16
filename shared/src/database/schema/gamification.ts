import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./auth";

export const dailyGoals = pgTable(
  "daily_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    meals_target: integer("meals_target").notNull().default(0),
    meals_completed: integer("meals_completed").notNull().default(0),
    workout_target: integer("workout_target").notNull().default(0),
    workout_completed: integer("workout_completed").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    completion_percentage: integer("completion_percentage").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.student_id, table.date)],
);

export const studentStreaks = pgTable("student_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  current_streak: integer("current_streak").notNull().default(0),
  longest_streak: integer("longest_streak").notNull().default(0),
  last_activity_date: date("last_activity_date"),
  freeze_available: integer("freeze_available").notNull().default(0),
  last_freeze_date: date("last_freeze_date"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'streak' | 'milestone' | 'challenge'
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  points: integer("points").notNull().default(0),
  earned_at: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Pontos da semana por aluno, gravados só pelo trigger de `workout_sessions`
 * (migration 0059). O cliente lê a própria linha; o placar com outras pessoas
 * sai só pela RPC `get_leaderboard`.
 */
export const rankingScores = pgTable(
  "ranking_scores",
  {
    student_id: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    week_start_date: date("week_start_date").notNull(),
    points: integer("points").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.student_id, table.week_start_date] })],
);
