import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", ["admin", "specialist", "student", "member"]);

export const accountStatusEnum = pgEnum("account_status", ["active", "inactive", "invited"]);

export const serviceTypeEnum = pgEnum("service_type", [
  "personal_training",
  "nutrition_consulting",
]);

export const personaTrackEnum = pgEnum("persona_track_type", [
  "beginner",
  "returning",
  "intermediate",
  "advanced",
]);

export const coachModeEnum = pgEnum("coach_mode_type", ["express", "analytical"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  full_name: text("full_name"),
  avatar_url: text("avatar_url"),
  account_type: accountTypeEnum("account_type").notNull(),
  account_status: accountStatusEnum("account_status").notNull().default("active"),
  persona_track: text("persona_track"),
  /** Anotação administrativa sobre a conta (0031). Não é dado de saúde. */
  admin_notes: text("admin_notes"),
  coach_mode: text("coach_mode"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Serviços que o specialist oferece — separado porque pode ter personal_training E nutrition_consulting
export const specialistServices = pgTable("specialist_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  specialist_id: uuid("specialist_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  service_type: serviceTypeEnum("service_type").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
