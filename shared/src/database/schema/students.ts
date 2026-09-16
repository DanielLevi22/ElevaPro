import { pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { profiles, serviceTypeEnum } from "./auth";

export const linkStatusEnum = pgEnum("link_status", ["active", "inactive"]);

export const consentTypeEnum = pgEnum("consent_type", [
  "health_data_collection",
  "technique_analysis",
  "ranking",
]);

export const studentSpecialists = pgTable("student_specialists", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  specialist_id: uuid("specialist_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  service_type: serviceTypeEnum("service_type").notNull(),
  status: linkStatusEnum("status").notNull().default("active"),
  ended_by: uuid("ended_by").references(() => profiles.id, { onDelete: "set null" }),
  ended_at: timestamp("ended_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Partial unique index enforced via raw SQL in migration:
// UNIQUE(student_id, service_type) WHERE status = 'active'

export const studentLinkCodes = pgTable("student_link_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const studentConsents = pgTable(
  "student_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    consent_type: consentTypeEnum("consent_type").notNull(),
    given_at: timestamp("given_at", { withTimezone: true }).notNull().defaultNow(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    policy_version: text("policy_version").notNull(),
  },
  (table) => [unique().on(table.student_id, table.consent_type)],
);
