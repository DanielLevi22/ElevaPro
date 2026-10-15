import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { physicalAssessments } from "./assessment";
import { profiles } from "./auth";

export const dietPlanStatusEnum = pgEnum("diet_plan_status", ["active", "finished", "draft"]);
export const dietPlanTypeEnum = pgEnum("diet_plan_type", ["unique", "cyclic"]);

export const foods = pgTable("foods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category"),
  serving_size: numeric("serving_size", { precision: 7, scale: 2 }).notNull().default("100"),
  serving_unit: text("serving_unit").notNull().default("g"),
  calories: numeric("calories", { precision: 7, scale: 2 }),
  protein: numeric("protein", { precision: 7, scale: 2 }),
  carbs: numeric("carbs", { precision: 7, scale: 2 }),
  fat: numeric("fat", { precision: 7, scale: 2 }),
  fiber: numeric("fiber", { precision: 7, scale: 2 }),
  source: text("source"),
  is_custom: boolean("is_custom").notNull().default(false),
  // NULL = alimento público (TBCA/USDA); preenchido = criado por specialist
  created_by: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  // search_vector tsvector gerado por trigger — não gerenciado pelo Drizzle
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dietPlans = pgTable("diet_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  specialist_id: uuid("specialist_id").references(() => profiles.id, { onDelete: "set null" }),
  name: text("name"),
  plan_type: dietPlanTypeEnum("plan_type").notNull().default("cyclic"),
  status: dietPlanStatusEnum("status").notNull().default("active"),
  version: integer("version").notNull().default(1),
  source_plan_id: uuid("source_plan_id").references((): AnyPgColumn => dietPlans.id, {
    onDelete: "set null",
  }),
  start_date: date("start_date"),
  end_date: date("end_date"),
  // Por que a dieta acabou: block_completed ou replaced (0090, #376).
  end_reason: text("end_reason"),
  target_calories: numeric("target_calories", { precision: 7, scale: 2 }),
  target_protein: numeric("target_protein", { precision: 7, scale: 2 }),
  target_carbs: numeric("target_carbs", { precision: 7, scale: 2 }),
  target_fat: numeric("target_fat", { precision: 7, scale: 2 }),
  notes: text("notes"),
  // Preferências do plano (0074, #337). A restrição é vocabulário fechado de
  // exclusão de alimento, com CHECK no banco: diagnóstico fica na anamnese.
  dietary_restrictions: text("dietary_restrictions").array().notNull().default([]),
  meals_per_day: integer("meals_per_day"),
  allows_supplements: boolean("allows_supplements"),
  free_meal_days: integer("free_meal_days").array().notNull().default([]),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dietMeals = pgTable("diet_meals", {
  id: uuid("id").primaryKey().defaultRandom(),
  diet_plan_id: uuid("diet_plan_id")
    .notNull()
    .references(() => dietPlans.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  meal_type: text("meal_type"),
  meal_order: integer("meal_order").notNull().default(0),
  // NULL = dieta única (todas os dias); 0–6 = dieta cíclica (0=Dom)
  day_of_week: integer("day_of_week"),
  meal_time: text("meal_time"),
  target_calories: numeric("target_calories", { precision: 7, scale: 2 }),
  // Preparo informado pelo especialista (0053). Nulo = não informado: a tela
  // do aluno esconde a linha em vez de inventar um tempo.
  prep_minutes: integer("prep_minutes"),
  difficulty: text("difficulty"),
  servings: integer("servings"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dietMealItems = pgTable("diet_meal_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  diet_meal_id: uuid("diet_meal_id")
    .notNull()
    .references(() => dietMeals.id, { onDelete: "cascade" }),
  food_id: uuid("food_id")
    .notNull()
    .references(() => foods.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 7, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  order_index: integer("order_index").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    diet_plan_id: uuid("diet_plan_id").references(() => dietPlans.id, { onDelete: "set null" }),
    diet_meal_id: uuid("diet_meal_id").references(() => dietMeals.id, { onDelete: "set null" }),
    logged_date: date("logged_date").notNull(),
    completed: boolean("completed").notNull().default(false),
    actual_items: jsonb("actual_items"),
    // `notes` e `photo_url` saíram na `0035`: nasceram com a tabela e nunca
    // tiveram caminho de escrita — nenhuma tela pedia o texto, nenhum serviço o
    // gravava, e não havia bucket para a foto. Ver seção 2.3 de
    // docs/LGPD_COMPLIANCE.md.
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.student_id, table.diet_meal_id, table.logged_date)],
);

// Check-in da semana (#376): como foi o registro e o peso, que mora em
// `physical_assessments` como medida declarada. Só as funções da 0088 gravam.
export const checkInLoggingEnum = pgEnum("check_in_logging", [
  "all",
  "partial",
  "followed_unlogged",
  "not_followed",
]);
export const checkInStatusEnum = pgEnum("check_in_status", ["pending", "approved", "kept"]);
export const planAdjustmentKindEnum = pgEnum("plan_adjustment_kind", [
  "calories",
  "plan_simplified",
]);

export const weeklyCheckIns = pgTable(
  "weekly_check_ins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    week_start: date("week_start").notNull(),
    logging: checkInLoggingEnum("logging").notNull(),
    assessment_id: uuid("assessment_id").references(() => physicalAssessments.id, {
      onDelete: "set null",
    }),
    status: checkInStatusEnum("status").notNull().default("pending"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("weekly_check_ins_once_per_week").on(table.student_id, table.week_start)],
);

// Ajuste aprovado no plano: antes, depois e o motivo. Append-only.
export const planAdjustments = pgTable("plan_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  check_in_id: uuid("check_in_id").references(() => weeklyCheckIns.id, { onDelete: "set null" }),
  kind: planAdjustmentKindEnum("kind").notNull(),
  before_value: numeric("before_value").notNull(),
  after_value: numeric("after_value").notNull(),
  reason: text("reason").notNull(),
  source: text("source").notNull(),
  diet_plan_id: uuid("diet_plan_id").references(() => dietPlans.id, { onDelete: "set null" }),
  approved_at: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
});
