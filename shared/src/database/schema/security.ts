import {
  bigint,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./auth";

const privateSchema = pgSchema("private");

/**
 * Contadores efêmeros de abuso, inacessíveis pelo cliente.
 *
 * `subject_hash` é HMAC no BFF, nunca IP, e-mail ou token em texto claro.
 */
export const rateLimitBuckets = privateSchema.table(
  "rate_limit_buckets",
  {
    bucket: text("bucket").notNull(),
    subject_hash: text("subject_hash").notNull(),
    window_started_at: timestamp("window_started_at", { withTimezone: true }).notNull(),
    hits: integer("hits").notNull().default(0),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bucket, table.subject_hash, table.window_started_at] }),
    index("rate_limit_buckets_expires_at_idx").on(table.expires_at),
  ],
);

/** Metadados mínimos de eventos de segurança; conteúdo e valores sensíveis não entram. */
export const securityAuditEvents = privateSchema.table(
  "security_audit_events",
  {
    event_id: bigint("event_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    occurred_at: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    event_type: text("event_type").notNull(),
    outcome: text("outcome").notNull(),
    actor_id: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    subject_id: uuid("subject_id").references(() => profiles.id, { onDelete: "set null" }),
    resource_type: text("resource_type").notNull(),
    resource_id: text("resource_id").notNull(),
    origin: text("origin").notNull(),
    trace_id: text("trace_id"),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("security_audit_events_occurred_at_idx").on(table.occurred_at),
    index("security_audit_events_actor_id_idx").on(table.actor_id),
    index("security_audit_events_subject_id_idx").on(table.subject_id),
    index("security_audit_events_expires_at_idx").on(table.expires_at),
  ],
);
