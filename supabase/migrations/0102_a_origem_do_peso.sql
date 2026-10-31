-- A origem do peso do check-in (#376, F9): digitado pela pessoa ou a média da
-- semana lida do app Saúde / Health Connect, editável antes de enviar.
--
-- A origem fica no check-in, e não em `physical_assessments.measured_by`: o peso
-- do app Saúde é a mesma balança de casa (`self`), e um valor novo de fonte
-- partiria a série do gráfico de tendência, que não mistura fontes. Só a média
-- é gravada; as pesagens lidas morrem no aparelho (LGPD_COMPLIANCE §2.3). A
-- origem não é dado de saúde: diz como o número chegou, para o especialista e
-- para a correção.
ALTER TABLE "weekly_check_ins"
  ADD COLUMN "weight_origin" text,
  ADD CONSTRAINT "weekly_check_ins_weight_origin"
    CHECK ("weight_origin" IN ('manual', 'health_app'));
--> statement-breakpoint

COMMENT ON COLUMN "weekly_check_ins"."weight_origin" IS
  'De onde veio o peso do check-in: manual ou health_app (a média da semana do app Saúde). Nulo sem peso (#376, F9).';
--> statement-breakpoint

-- A assinatura muda: a antiga sai para não sobrar sobrecarga que grave sem origem.
DROP FUNCTION public.submit_weekly_check_in(public.check_in_logging, numeric);
--> statement-breakpoint

CREATE FUNCTION public.submit_weekly_check_in(
  p_logging public.check_in_logging,
  p_weight_kg numeric,
  p_weight_origin text DEFAULT 'manual'
)
 RETURNS public.weekly_check_ins
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

  IF p_weight_kg IS NOT NULL AND p_weight_origin NOT IN ('manual', 'health_app') THEN
    RAISE EXCEPTION 'origem do peso % desconhecida: use manual ou health_app', p_weight_origin
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

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

  INSERT INTO public.weekly_check_ins (student_id, week_start, logging, assessment_id, weight_origin)
    VALUES (v_me, v_week, p_logging, v_assessment,
            CASE WHEN p_weight_kg IS NULL THEN NULL ELSE p_weight_origin END)
  ON CONFLICT (student_id, week_start)
    DO UPDATE SET logging = EXCLUDED.logging,
                  assessment_id = EXCLUDED.assessment_id,
                  -- Sem peso novo, a origem do que já foi gravado fica.
                  weight_origin = COALESCE(EXCLUDED.weight_origin, public.weekly_check_ins.weight_origin)
  RETURNING * INTO v_check_in;

  RETURN v_check_in;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.submit_weekly_check_in(public.check_in_logging, numeric, text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.submit_weekly_check_in(public.check_in_logging, numeric, text) TO authenticated;
