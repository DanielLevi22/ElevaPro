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
