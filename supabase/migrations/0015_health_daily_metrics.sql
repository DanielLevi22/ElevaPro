-- health_daily_metrics — agregado diário de passos e calorias ativas.
--
-- Base legal: Tutela da Saúde (Art. 11, II, f) + Consentimento (Art. 11, I) — LGPD.
-- Minimização: guarda apenas o total do dia, nunca a série bruta do sensor. A
-- granularidade fina do Health Connect permitiria inferir rotina e deslocamento,
-- o que excede a finalidade de acompanhamento de atividade.
--
-- Retenção: enquanto a conta existir (ON DELETE CASCADE). Revogar o consentimento
-- interrompe a coleta mas preserva o histórico já gravado — revogação é
-- prospectiva, mesmo comportamento de meal_logs e physical_assessments.

CREATE TABLE "health_daily_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL,
  "date" date NOT NULL,
  "steps" integer DEFAULT 0 NOT NULL,
  "active_calories" integer DEFAULT 0 NOT NULL,
  "synced_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "health_daily_metrics_student_id_date_unique" UNIQUE("student_id", "date"),
  CONSTRAINT "health_daily_metrics_steps_non_negative" CHECK ("steps" >= 0),
  CONSTRAINT "health_daily_metrics_calories_non_negative" CHECK ("active_calories" >= 0)
);
--> statement-breakpoint

ALTER TABLE "health_daily_metrics"
  ADD CONSTRAINT "health_daily_metrics_student_id_profiles_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Consulta dominante: série do aluno num intervalo, mais recente primeiro.
CREATE INDEX "health_daily_metrics_student_date_idx"
  ON "health_daily_metrics" ("student_id", "date" DESC);
--> statement-breakpoint

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE "health_daily_metrics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Aluno/member gerencia as próprias métricas (o app escreve em nome dele).
CREATE POLICY "student_own_health_metrics" ON "health_daily_metrics"
  FOR ALL USING ("student_id" = auth.uid());
--> statement-breakpoint

-- Specialist apenas lê, e apenas de aluno com vínculo ativo. Desvinculou, perde
-- acesso na mesma consulta — sem job de limpeza, sem janela de exposição.
CREATE POLICY "specialist_read_linked_health_metrics" ON "health_daily_metrics"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_specialists ss
      WHERE ss.student_id = health_daily_metrics.student_id
        AND ss.specialist_id = auth.uid()
        AND ss.status = 'active'
    )
  );
