import { index, integer, pgSchema, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

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
