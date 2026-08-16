import { boolean, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./auth";

export const studentAnamnesis = pgTable("student_anamnesis", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  responses: jsonb("responses").notNull().default({}),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const physicalAssessments = pgTable("physical_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  specialist_id: uuid("specialist_id").references(() => profiles.id, { onDelete: "set null" }),
  assessed_at: timestamp("assessed_at", { withTimezone: true }).notNull().defaultNow(),
  // Básico
  weight_kg: numeric("weight_kg", { precision: 5, scale: 2 }),
  height_cm: numeric("height_cm", { precision: 5, scale: 2 }),
  // Composição corporal
  body_fat_pct: numeric("body_fat_pct", { precision: 5, scale: 2 }),
  muscle_mass_kg: numeric("muscle_mass_kg", { precision: 5, scale: 2 }),
  // Dobras cutâneas (mm) — protocolo Jackson-Pollock 7
  skinfold_chest: numeric("skinfold_chest", { precision: 5, scale: 2 }),
  skinfold_abdomen: numeric("skinfold_abdomen", { precision: 5, scale: 2 }),
  skinfold_thigh: numeric("skinfold_thigh", { precision: 5, scale: 2 }),
  skinfold_tricep: numeric("skinfold_tricep", { precision: 5, scale: 2 }),
  skinfold_suprailiac: numeric("skinfold_suprailiac", { precision: 5, scale: 2 }),
  skinfold_subscapular: numeric("skinfold_subscapular", { precision: 5, scale: 2 }),
  skinfold_midaxillary: numeric("skinfold_midaxillary", { precision: 5, scale: 2 }),
  // Circunferências (cm)
  circ_waist: numeric("circ_waist", { precision: 5, scale: 2 }),
  circ_hip: numeric("circ_hip", { precision: 5, scale: 2 }),
  circ_chest: numeric("circ_chest", { precision: 5, scale: 2 }),
  circ_right_arm: numeric("circ_right_arm", { precision: 5, scale: 2 }),
  circ_left_arm: numeric("circ_left_arm", { precision: 5, scale: 2 }),
  circ_right_thigh: numeric("circ_right_thigh", { precision: 5, scale: 2 }),
  circ_left_thigh: numeric("circ_left_thigh", { precision: 5, scale: 2 }),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bodyScans = pgTable("body_scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  scanned_at: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  // Sem coluna de foto, de propósito: a imagem não é persistida — só o
  // resultado derivado (`ADR-010`). As quatro `photo_*_url` saíram na 0026.
  // Métricas derivadas pela IA
  height_cm: numeric("height_cm", { precision: 5, scale: 2 }),
  weight_kg: numeric("weight_kg", { precision: 5, scale: 2 }),
  body_fat_pct: numeric("body_fat_pct", { precision: 5, scale: 2 }),
  muscle_mass_kg: numeric("muscle_mass_kg", { precision: 5, scale: 2 }),
  bmi: numeric("bmi", { precision: 5, scale: 2 }),
  // Segmentos (cm)
  circ_chest: numeric("circ_chest", { precision: 5, scale: 2 }),
  circ_waist: numeric("circ_waist", { precision: 5, scale: 2 }),
  circ_hips: numeric("circ_hips", { precision: 5, scale: 2 }),
  circ_arms: numeric("circ_arms", { precision: 5, scale: 2 }),
  circ_thighs: numeric("circ_thighs", { precision: 5, scale: 2 }),
  circ_calves: numeric("circ_calves", { precision: 5, scale: 2 }),
  circ_neck: numeric("circ_neck", { precision: 5, scale: 2 }),
  circ_shoulders: numeric("circ_shoulders", { precision: 5, scale: 2 }),
  // Postura — scores numéricos
  posture_symmetry_score: numeric("posture_symmetry_score", { precision: 4, scale: 2 }),
  posture_muscle_score: numeric("posture_muscle_score", { precision: 4, scale: 2 }),
  posture_overall_score: numeric("posture_overall_score", { precision: 4, scale: 2 }),
  // Análise textual da IA
  // Como a foto foi enquadrada — o que permite dizer se dois escaneamentos são
  // comparáveis. Nulável: capturas anteriores à 0027 não têm (`ADR-010`).
  framing_mark_top: numeric("framing_mark_top", { precision: 4, scale: 3 }),
  framing_mark_bottom: numeric("framing_mark_bottom", { precision: 4, scale: 3 }),
  framing_pitch: numeric("framing_pitch", { precision: 5, scale: 2 }),
  framing_roll: numeric("framing_roll", { precision: 5, scale: 2 }),
  framing_level_sensor: boolean("framing_level_sensor"),
  posture_feedback: jsonb("posture_feedback"),
  recommendations: text("recommendations"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
