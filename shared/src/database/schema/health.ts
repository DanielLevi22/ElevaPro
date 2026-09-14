import { date, integer, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./auth";

/**
 * Agregado diário de atividade lido do Health Connect / HealthKit.
 *
 * Guarda só o total do dia — a série bruta do sensor revelaria rotina e
 * deslocamento, além da finalidade de acompanhamento. Retenção vinculada à
 * conta via cascade.
 */
export const healthDailyMetrics = pgTable(
  "health_daily_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    steps: integer("steps").notNull().default(0),
    active_calories: integer("active_calories").notNull().default(0),
    // Null-áveis, ao contrário de steps e active_calories: nulo é ausência de
    // leitura, e zero é uma leitura de zero. Confundir os dois foi o defeito
    // que `hasRecords` corrigiu na leitura do Health Connect.
    sleep_minutes: integer("sleep_minutes"),
    resting_heart_rate: integer("resting_heart_rate"),
    synced_at: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Torna a escrita idempotente: o background fetch tem intervalo não
    // garantido e reenvia o acumulado do mesmo dia várias vezes.
    studentDateUnique: unique("health_daily_metrics_student_id_date_unique").on(
      table.student_id,
      table.date,
    ),
  }),
);

/**
 * A água bebida por dia, em ml (0052).
 *
 * Um total por dia, e não um registro por copo: a série revelaria a rotina do
 * dia inteiro. Só o próprio aluno lê e grava, e gravar exige consentimento no
 * banco — nenhuma tela do especialista consome o dado (issue #298).
 */
export const hydrationDaily = pgTable(
  "hydration_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    water_ml: integer("water_ml").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentDateUnique: unique("hydration_daily_student_id_date_unique").on(
      table.student_id,
      table.date,
    ),
  }),
);
