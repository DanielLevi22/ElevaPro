import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./auth";

/**
 * Sessões de chat com a IA. Criadas pela migration 0003 e nunca declaradas
 * aqui — o schema Drizzle ficou sem elas até 2026-08-02.
 *
 * Isso importa porque `drizzle-kit generate` emite migration a partir do diff
 * do schema: tabela ausente aqui pode virar DROP TABLE na próxima geração.
 */
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  specialist_id: uuid("specialist_id").references(() => profiles.id, { onDelete: "set null" }),
  module: text("module").notNull().default("workout"),
  state: jsonb("state").default({}),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: uuid("session_id")
    .notNull()
    .references(() => aiChatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
