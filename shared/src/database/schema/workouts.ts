import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./auth";

export const trainingStatusEnum = pgEnum("training_status", ["planned", "active", "completed"]);

export const workoutDifficultyEnum = pgEnum("workout_difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

// Catálogo de exercícios — globais (is_verified=true) ou criados por specialists
export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  muscle_group: text("muscle_group"),
  description: text("description"),
  video_url: text("video_url"),
  is_verified: boolean("is_verified").notNull().default(false),
  // NULL = exercício oficial da plataforma; preenchido = criado por specialist
  created_by: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Macrociclo de treinamento (ex: "Projeto Verão 2026")
export const trainingPeriodizations = pgTable("training_periodizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  specialist_id: uuid("specialist_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  objective: text("objective"),
  status: trainingStatusEnum("status").notNull().default("planned"),
  // NOT NULL desde a `0024`. Estavam nuláveis aqui: o tipo aceitava um insert
  // sem data que o banco recusava — e foi assim que salvar o plano do coach de
  // IA e criar ficha de treino ficaram quebrados sem sintoma no compilador.
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  // Vieram na `0004` e nunca entraram neste schema (dívida #40).
  level: text("level"),
  duration_weeks: integer("duration_weeks"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Fase/mesociclo dentro de uma periodização (ex: "Fase de Adaptação")
export const trainingPlans = pgTable("training_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  periodization_id: uuid("periodization_id")
    .notNull()
    .references(() => trainingPeriodizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: trainingStatusEnum("status").notNull().default("planned"),
  // NOT NULL desde a `0024`, como em training_periodizations.
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  order_index: integer("order_index").notNull().default(0),
  // Vieram na `0004` e nunca entraram neste schema (dívida #40).
  duration_weeks: integer("duration_weeks"),
  focus: text("focus"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Treino — pertence a uma fase (training_plan_id preenchido) ou à biblioteca (NULL)
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  specialist_id: uuid("specialist_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  // NULL = treino da biblioteca pessoal do specialist
  training_plan_id: uuid("training_plan_id").references(() => trainingPlans.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  description: text("description"),
  muscle_group: text("muscle_group"),
  difficulty: workoutDifficultyEnum("difficulty"),
  day_of_week: dayOfWeekEnum("day_of_week"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Prescrição de exercício dentro de um treino
export const workoutExercises = pgTable("workout_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  workout_id: uuid("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  exercise_id: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "restrict" }),
  sets: integer("sets"),
  reps: text("reps"),
  weight: text("weight"),
  rest_seconds: integer("rest_seconds"),
  order_index: integer("order_index").notNull().default(0),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execução real de um treino pelo aluno
export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  // SET NULL: histórico do aluno preservado mesmo se o treino for deletado
  workout_id: uuid("workout_id").references(() => workouts.id, { onDelete: "set null" }),
  started_at: timestamp("started_at", { withTimezone: true }).notNull(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  intensity: integer("intensity"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Séries executadas por exercício na sessão
export const workoutSessionExercises = pgTable("workout_session_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: uuid("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  // Referencia a prescrição (não o catálogo) para comparar prescrito vs executado
  // SET NULL: sets_data preservado mesmo se a prescrição for deletada
  workout_exercise_id: uuid("workout_exercise_id").references(() => workoutExercises.id, {
    onDelete: "set null",
  }),
  // Referencia o catálogo. Existe no banco desde antes da 0023 e faltava aqui:
  // o schema descrevia uma tabela diferente da real, e como as guardas leem o
  // schema, a divergência era invisível para elas também.
  exercise_id: uuid("exercise_id"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Série normalizada de cada set executado — criada pela migration 0007 e nunca
 * declarada aqui.
 *
 * Convive com `workout_session_exercises.sets_data`, que guarda o mesmo dado em
 * JSONB. São duas representações concorrentes; consolidar é dívida registrada
 * no STATUS.md, não decisão deste arquivo.
 */
export const workoutSessionSets = pgTable("workout_session_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_exercise_id: uuid("session_exercise_id")
    .notNull()
    .references(() => workoutSessionExercises.id, { onDelete: "cascade" }),
  set_index: integer("set_index").notNull(),
  reps_prescribed: text("reps_prescribed"),
  reps_actual: integer("reps_actual"),
  weight_prescribed: numeric("weight_prescribed"),
  weight_actual: numeric("weight_actual"),
  rest_prescribed: integer("rest_prescribed"),
  rest_actual: integer("rest_actual"),
  completed: boolean("completed").notNull().default(false),
  skipped: boolean("skipped").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
