-- O check-in da semana recalibra a meta do Praticante (#376, fatia 1).
--
-- A meta de calorias do onboarding sai de fórmula e pode errar mais de 500
-- kcal/dia. Uma vez por semana a pessoa diz como foi o registro e o peso; o
-- código compara com o ritmo esperado e propõe um ajuste, que só vale aprovado
-- (ADR-0020, Art. 20). O Aluno faz o mesmo check-in, mas sem peso (ADR-0030:
-- com especialista, quem mede é ele) e sem ajuste automático.
--
-- O peso não ganha coluna nova: vai para `physical_assessments` como medida
-- declarada (`measured_by = 'self'`), que já tem consentimento, correção e
-- exclusão (Art. 6°, III). O check-in só aponta para ela.
--
-- As duas tabelas são de Art. 11 (aderência e meta da dieta): o especialista
-- lê com vínculo ativo e consentimento, e a revogação fecha. Ninguém escreve
-- direto: as funções gravam com o autor do JWT e a hora do servidor.
CREATE TYPE public.check_in_logging AS ENUM ('all', 'partial', 'followed_unlogged', 'not_followed');
--> statement-breakpoint
CREATE TYPE public.check_in_status AS ENUM ('pending', 'approved', 'kept');
--> statement-breakpoint
CREATE TYPE public.plan_adjustment_kind AS ENUM ('calories');
--> statement-breakpoint

CREATE TABLE "weekly_check_ins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL
    REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  -- A segunda-feira da semana, no fuso do Brasil: calculada pela função.
  "week_start" date NOT NULL,
  "logging" public.check_in_logging NOT NULL,
  -- Apagar a medida (Art. 18, VI) não apaga o check-in: ele só perde o peso.
  "assessment_id" uuid
    REFERENCES "public"."physical_assessments"("id") ON DELETE SET NULL,
  "status" public.check_in_status NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "weekly_check_ins_once_per_week" UNIQUE ("student_id", "week_start")
);
--> statement-breakpoint

COMMENT ON TABLE "weekly_check_ins" IS
  'Check-in semanal do aluno: como foi o registro e a referência ao peso declarado. Tutela da saúde + Consentimento (Art. 11, II, f + I). Gravado só por public.submit_weekly_check_in (#376).';
--> statement-breakpoint

CREATE TABLE "plan_adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL
    REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "check_in_id" uuid
    REFERENCES "public"."weekly_check_ins"("id") ON DELETE SET NULL,
  "kind" public.plan_adjustment_kind NOT NULL,
  "before_value" numeric NOT NULL,
  "after_value" numeric NOT NULL,
  "reason" text NOT NULL,
  "source" text NOT NULL,
  -- A versão da dieta que o ajuste criou.
  "diet_plan_id" uuid
    REFERENCES "public"."diet_plans"("id") ON DELETE SET NULL,
  "approved_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "plan_adjustments_reason" CHECK ("reason" IN ('weight_above_pace', 'weight_below_pace')),
  CONSTRAINT "plan_adjustments_source" CHECK ("source" IN ('rule', 'specialist'))
);
--> statement-breakpoint

COMMENT ON TABLE "plan_adjustments" IS
  'Histórico dos ajustes aprovados no plano: antes, depois e o motivo. Tutela da saúde + Consentimento (Art. 11, II, f + I). Gravado só pelas funções de ajuste; ninguém corrige nem apaga (#376).';
--> statement-breakpoint

CREATE INDEX "plan_adjustments_student_approved_idx"
  ON "plan_adjustments" ("student_id", "approved_at" DESC);
--> statement-breakpoint
CREATE INDEX "plan_adjustments_check_in_idx" ON "plan_adjustments" ("check_in_id");
--> statement-breakpoint
CREATE INDEX "plan_adjustments_diet_plan_idx" ON "plan_adjustments" ("diet_plan_id");
--> statement-breakpoint
CREATE INDEX "weekly_check_ins_assessment_idx" ON "weekly_check_ins" ("assessment_id");
--> statement-breakpoint

ALTER TABLE "weekly_check_ins" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "plan_adjustments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "weekly_check_ins", "plan_adjustments" FROM anon;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "weekly_check_ins", "plan_adjustments" FROM authenticated;
--> statement-breakpoint
GRANT SELECT ON "weekly_check_ins", "plan_adjustments" TO authenticated;
--> statement-breakpoint

CREATE POLICY "weekly_check_ins_student_read" ON "weekly_check_ins"
  FOR SELECT TO authenticated
  USING ("student_id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "weekly_check_ins_specialist_read" ON "weekly_check_ins"
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_linked_specialist("student_id"))
    AND (SELECT private.health_consent_not_revoked("student_id"))
  );
--> statement-breakpoint
CREATE POLICY privileged_session_requires_mfa ON "weekly_check_ins"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement())
  WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint

CREATE POLICY "plan_adjustments_student_read" ON "plan_adjustments"
  FOR SELECT TO authenticated
  USING ("student_id" = (SELECT auth.uid()));
--> statement-breakpoint
CREATE POLICY "plan_adjustments_specialist_read" ON "plan_adjustments"
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_linked_specialist("student_id"))
    AND (SELECT private.health_consent_not_revoked("student_id"))
  );
--> statement-breakpoint
CREATE POLICY privileged_session_requires_mfa ON "plan_adjustments"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement())
  WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint

-- A semana vai de segunda a domingo no fuso do Brasil. Pelo relógio do
-- servidor, em UTC, o check-in de domingo à noite cairia na semana seguinte.
CREATE OR REPLACE FUNCTION private.current_check_in_week()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;
--> statement-breakpoint

-- A altura que acompanha o peso da semana: a última declarada, ou a da
-- anamnese. A medida exige as duas (0037), e o check-in pergunta só o peso.
CREATE OR REPLACE FUNCTION private.declared_height(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT pa.height_cm FROM public.physical_assessments pa
      WHERE pa.student_id = p_student_id AND pa.measured_by = 'self'
      ORDER BY pa.assessed_at DESC LIMIT 1),
    (SELECT NULLIF(sa.responses->>'height', '')::numeric FROM public.student_anamnesis sa
      WHERE sa.student_id = p_student_id)
  );
$$;
--> statement-breakpoint

-- Grava o check-in da semana. O peso vira medida declarada; com especialista
-- ativo ele é recusado (ADR-0030). Refazer na mesma semana corrige a resposta
-- e o peso enquanto o ajuste não foi decidido.
CREATE OR REPLACE FUNCTION public.submit_weekly_check_in(
  p_logging public.check_in_logging,
  p_weight_kg numeric
)
RETURNS public.weekly_check_ins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_week date := private.current_check_in_week();
  v_check_in public.weekly_check_ins;
  v_assessment uuid;
  v_height numeric;
BEGIN
  IF v_me IS NULL OR NOT private.current_session_meets_mfa_requirement()
     OR NOT EXISTS (SELECT 1 FROM public.profiles p
                    WHERE p.id = v_me AND p.account_type IN ('student', 'member')) THEN
    RAISE EXCEPTION 'check-in recusado: só o aluno faz o próprio check-in'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT private.has_health_consent(v_me) THEN
    RAISE EXCEPTION 'check-in recusado: exige o consentimento de dados de saúde vigente'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_check_in FROM public.weekly_check_ins
    WHERE student_id = v_me AND week_start = v_week FOR UPDATE;
  IF v_check_in.id IS NOT NULL AND v_check_in.status <> 'pending' THEN
    RAISE EXCEPTION 'check-in da semana de % já foi decidido (%)', v_week, v_check_in.status
      USING ERRCODE = 'check_violation';
  END IF;
  v_assessment := v_check_in.assessment_id;

  IF p_weight_kg IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.student_specialists s
               WHERE s.student_id = v_me AND s.status = 'active') THEN
      RAISE EXCEPTION 'peso recusado: com especialista ativo, quem mede é ele (ADR-0030)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_weight_kg < 30 OR p_weight_kg > 300 THEN
      RAISE EXCEPTION 'peso % kg fora da faixa: use quilos de 30 a 300', p_weight_kg
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_height := private.declared_height(v_me);
    IF v_height IS NULL THEN
      RAISE EXCEPTION 'peso recusado: sem altura declarada para acompanhar a medida'
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_assessment IS NOT NULL THEN
      UPDATE public.physical_assessments SET weight_kg = p_weight_kg
        WHERE id = v_assessment AND measured_by = 'self';
    ELSE
      INSERT INTO public.physical_assessments (student_id, measured_by, specialist_id, weight_kg, height_cm)
        VALUES (v_me, 'self', NULL, p_weight_kg, v_height)
        RETURNING id INTO v_assessment;
    END IF;
  END IF;

  INSERT INTO public.weekly_check_ins (student_id, week_start, logging, assessment_id)
    VALUES (v_me, v_week, p_logging, v_assessment)
  ON CONFLICT (student_id, week_start)
    DO UPDATE SET logging = EXCLUDED.logging, assessment_id = EXCLUDED.assessment_id
  RETURNING * INTO v_check_in;

  RETURN v_check_in;
END;
$$;
--> statement-breakpoint

-- O check-in pendente da semana atual, do próprio aluno, travado para a decisão.
CREATE OR REPLACE FUNCTION private.pending_check_in(p_check_in_id uuid)
RETURNS public.weekly_check_ins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_check_in public.weekly_check_ins;
BEGIN
  SELECT * INTO v_check_in FROM public.weekly_check_ins
    WHERE id = p_check_in_id AND student_id = (SELECT auth.uid())
      AND week_start = private.current_check_in_week() AND status = 'pending'
    FOR UPDATE;
  IF v_check_in.id IS NULL THEN
    RAISE EXCEPTION 'check-in % não está pendente nesta semana para você', p_check_in_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN v_check_in;
END;
$$;
--> statement-breakpoint

-- "Manter mais uma semana", ou o fim de uma semana sem dado para ajustar.
CREATE OR REPLACE FUNCTION public.keep_weekly_target(p_check_in_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_check_in public.weekly_check_ins := private.pending_check_in(p_check_in_id);
BEGIN
  UPDATE public.weekly_check_ins SET status = 'kept' WHERE id = v_check_in.id;
END;
$$;
--> statement-breakpoint

-- Aprova o ajuste de calorias do Praticante: nova versão da dieta, porções em
-- gramas e mililitros refeitas na proporção, carboidrato absorvendo a
-- diferença, a versão ativada e o ajuste registrado. Tudo ou nada.
--
-- A regra que escolhe o número mora no código (`weeklyRecalibration`); o banco
-- garante o que não pode passar mesmo com o cliente adulterado: só o próprio
-- Praticante, sem especialista, e no máximo 200 kcal por semana.
CREATE OR REPLACE FUNCTION public.apply_weekly_calorie_adjustment(
  p_check_in_id uuid,
  p_new_calories integer,
  p_reason text
)
RETURNS public.diet_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_check_in public.weekly_check_ins := private.pending_check_in(p_check_in_id);
  v_plan public.diet_plans;
  v_draft public.diet_plans;
  v_delta integer;
  v_factor numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.student_specialists s
             WHERE s.student_id = v_me AND s.status = 'active') THEN
    RAISE EXCEPTION 'ajuste recusado: com especialista ativo, quem muda o plano é ele'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT private.has_health_consent(v_me) THEN
    RAISE EXCEPTION 'ajuste recusado: exige o consentimento de dados de saúde vigente'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_plan FROM public.diet_plans
    WHERE student_id = v_me AND specialist_id IS NULL AND status = 'active'
    FOR UPDATE;
  IF v_plan.id IS NULL OR v_plan.target_calories IS NULL THEN
    RAISE EXCEPTION 'ajuste recusado: nenhuma dieta própria ativa com meta de calorias'
      USING ERRCODE = 'check_violation';
  END IF;

  v_delta := p_new_calories - v_plan.target_calories;
  IF v_delta = 0 OR abs(v_delta) > 200 THEN
    RAISE EXCEPTION 'ajuste de % kcal fora do passo semanal: use de 1 a 200 kcal para mais ou para menos', v_delta
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  -- Peso acima do ritmo esperado baixa a meta; abaixo, sobe. Vale para perder,
  -- manter e ganhar, e impede o motivo de contradizer o número.
  IF p_reason NOT IN ('weight_above_pace', 'weight_below_pace')
     OR (p_reason = 'weight_above_pace') <> (v_delta < 0) THEN
    RAISE EXCEPTION 'motivo % não combina com um ajuste de % kcal', p_reason, v_delta
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_draft := public.create_diet_plan_version(v_plan.id);
  v_factor := p_new_calories::numeric / v_plan.target_calories;

  UPDATE public.diet_meal_items SET quantity = GREATEST(5, round(quantity * v_factor / 5) * 5)
    WHERE unit IN ('g', 'ml')
      AND diet_meal_id IN (SELECT id FROM public.diet_meals WHERE diet_plan_id = v_draft.id);
  UPDATE public.diet_plans
     SET target_calories = p_new_calories,
         target_carbs = GREATEST(0, target_carbs + round(v_delta / 4.0))
   WHERE id = v_draft.id;

  v_plan := public.activate_diet_plan(v_draft.id);

  INSERT INTO public.plan_adjustments
    (student_id, check_in_id, kind, before_value, after_value, reason, source, diet_plan_id)
  VALUES
    (v_me, v_check_in.id, 'calories', v_plan.target_calories - v_delta, p_new_calories,
     p_reason, 'rule', v_plan.id);
  UPDATE public.weekly_check_ins SET status = 'approved' WHERE id = v_check_in.id;

  RETURN v_plan;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.current_check_in_week() FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.declared_height(uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.pending_check_in(uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.submit_weekly_check_in(public.check_in_logging, numeric) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.submit_weekly_check_in(public.check_in_logging, numeric) TO authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.keep_weekly_target(uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.keep_weekly_target(uuid) TO authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.apply_weekly_calorie_adjustment(uuid, integer, text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.apply_weekly_calorie_adjustment(uuid, integer, text) TO authenticated;
