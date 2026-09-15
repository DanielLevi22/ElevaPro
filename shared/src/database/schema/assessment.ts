import {
  boolean,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./auth";

/**
 * De onde veio a Escala de um Body scan.
 *
 * `assessment` é medida com fita pelo especialista; `self` é a medida declarada
 * pelo aluno (0056); `anamnese` é o peso e a altura do cadastro. O especialista precisa saber qual das duas calibrou o número que ele
 * está lendo — é a diferença entre confiar e ponderar.
 */
export const scaleSourceEnum = pgEnum("scale_source", ["assessment", "anamnese", "self"]);

/**
 * Quem mediu uma avaliação física (0056): o especialista, com fita, ou o próprio
 * aluno, que declara. A do especialista é imutável; a declarada, o aluno corrige.
 */
export const measurementSourceEnum = pgEnum("measurement_source", ["specialist", "self"]);

export const studentAnamnesis = pgTable("student_anamnesis", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  responses: jsonb("responses").notNull().default({}),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  // O mobile já mandava esta coluna no upsert; ela não existia e derrubava
  // todo salvamento com 42703 (migration 0029).
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const physicalAssessments = pgTable("physical_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  specialist_id: uuid("specialist_id").references(() => profiles.id, { onDelete: "set null" }),
  measured_by: measurementSourceEnum("measured_by").notNull().default("specialist"),
  assessed_at: timestamp("assessed_at", { withTimezone: true }).notNull().defaultNow(),
  // Básico
  // Obrigatórios: os dois formam a Escala que calibra o Body scan, e avaliação
  // sem eles não serve de fonte. Antes eram opcionais, e uma avaliação com só
  // circunferências deixava o aluno sem poder escanear sem nada explicar.
  weight_kg: numeric("weight_kg", { precision: 5, scale: 2 }).notNull(),
  height_cm: numeric("height_cm", { precision: 5, scale: 2 }).notNull(),
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
  // Completadas na 0030: o web já coletava e o mobile já exibia estas sete,
  // e não havia onde gravar. Bilateral onde a assimetria importa.
  circ_neck: numeric("circ_neck", { precision: 5, scale: 2 }),
  circ_shoulder: numeric("circ_shoulder", { precision: 5, scale: 2 }),
  /** Na altura do umbigo — `circ_waist` é a parte mais estreita. */
  circ_abdomen: numeric("circ_abdomen", { precision: 5, scale: 2 }),
  circ_right_forearm: numeric("circ_right_forearm", { precision: 5, scale: 2 }),
  circ_left_forearm: numeric("circ_left_forearm", { precision: 5, scale: 2 }),
  circ_right_calf: numeric("circ_right_calf", { precision: 5, scale: 2 }),
  circ_left_calf: numeric("circ_left_calf", { precision: 5, scale: 2 }),
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
  // resultado derivado (`ADR-0010`). As quatro `photo_*_url` saíram na 0026.
  // Métricas derivadas pela IA
  height_cm: numeric("height_cm", { precision: 5, scale: 2 }),
  weight_kg: numeric("weight_kg", { precision: 5, scale: 2 }),
  // Qual fonte calibrou ESTE scan. Sem isto o web rotula toda altura como
  // "medido", o que passa a mentir no momento em que a Anamnese vira fonte —
  // e derivar na leitura erraria assim que o especialista cadastrasse uma
  // avaliação depois do scan, reescrevendo o passado.
  scale_source: scaleSourceEnum("scale_source"),
  body_fat_pct: numeric("body_fat_pct", { precision: 5, scale: 2 }),
  /** Massa magra derivada de `peso × (1 − gordura)` — osso e água inclusos (0038). */
  lean_mass_kg: numeric("lean_mass_kg", { precision: 5, scale: 2 }),
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
  // comparáveis. Nulável: capturas anteriores à 0027 não têm (`ADR-0010`).
  framing_mark_top: numeric("framing_mark_top", { precision: 4, scale: 3 }),
  framing_mark_bottom: numeric("framing_mark_bottom", { precision: 4, scale: 3 }),
  framing_pitch: numeric("framing_pitch", { precision: 5, scale: 2 }),
  framing_roll: numeric("framing_roll", { precision: 5, scale: 2 }),
  framing_level_sensor: boolean("framing_level_sensor"),
  /** 'front' | 'back' — CHECK no banco (0028). Lentes diferentes não comparam. */
  framing_camera: text("framing_camera"),
  posture_feedback: jsonb("posture_feedback"),
  recommendations: text("recommendations"),
  // O que o aparelho mediu (0038). Uma conversão px/cm por pose: o aluno não
  // para na mesma distância nas três, e ler uma foto com a régua de outra
  // deslocaria as larguras sem ninguém perceber.
  px_per_cm_front: numeric("px_per_cm_front", { precision: 7, scale: 3 }),
  px_per_cm_back: numeric("px_per_cm_back", { precision: 7, scale: 3 }),
  px_per_cm_side: numeric("px_per_cm_side", { precision: 7, scale: 3 }),
  // Assimetrias da frontal, em cm e em grau: o cm diz o quanto, o grau diz o
  // quanto disso é inclinação e não distância entre ombros largos.
  shoulder_drop_cm: numeric("shoulder_drop_cm", { precision: 5, scale: 2 }),
  shoulder_tilt_deg: numeric("shoulder_tilt_deg", { precision: 5, scale: 2 }),
  hip_drop_cm: numeric("hip_drop_cm", { precision: 5, scale: 2 }),
  hip_tilt_deg: numeric("hip_tilt_deg", { precision: 5, scale: 2 }),
  axis_deviation_cm: numeric("axis_deviation_cm", { precision: 5, scale: 2 }),
  /** Veredito, não a razão bruta: com true, assimetria pode ser perspectiva. */
  trunk_rotated: boolean("trunk_rotated"),
  // Postura sagital da lateral. Anteriorização de cabeça só existe em ângulo.
  plumb_shoulder_cm: numeric("plumb_shoulder_cm", { precision: 5, scale: 2 }),
  plumb_hip_cm: numeric("plumb_hip_cm", { precision: 5, scale: 2 }),
  plumb_knee_cm: numeric("plumb_knee_cm", { precision: 5, scale: 2 }),
  // Luz não trava a captura, marca o scan — precedente do framing_level_sensor.
  quality_backlit: boolean("quality_backlit"),
  quality_low_light: boolean("quality_low_light"),
  quality_blown_out: boolean("quality_blown_out"),
  /** false quando o aluno usou a saída manual: enquadramento não confirmado. */
  framing_confirmed: boolean("framing_confirmed"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
