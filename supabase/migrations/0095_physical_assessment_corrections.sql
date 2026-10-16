-- Retificação não é nova medição (issue #385, arts. 6º, V e 18, III).
-- O conteúdo substituído é acervo sensível, nunca payload do log técnico.
CREATE TABLE public.physical_assessment_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.physical_assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  corrected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  corrected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  previous_values jsonb NOT NULL CHECK (jsonb_typeof(previous_values) = 'object')
);
--> statement-breakpoint
CREATE INDEX physical_assessment_revisions_assessment_date_idx
  ON public.physical_assessment_revisions (assessment_id, corrected_at DESC);
--> statement-breakpoint
CREATE INDEX physical_assessment_revisions_student_idx
  ON public.physical_assessment_revisions (student_id);
--> statement-breakpoint
ALTER TABLE public.physical_assessment_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.physical_assessment_revisions FROM anon, authenticated;
GRANT SELECT ON public.physical_assessment_revisions TO authenticated;
GRANT ALL ON public.physical_assessment_revisions TO service_role;
--> statement-breakpoint
CREATE POLICY assessment_revisions_read ON public.physical_assessment_revisions
  FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid())
    OR (
      corrected_by = (SELECT auth.uid())
      AND (SELECT private.is_linked_specialist(student_id))
      AND (SELECT private.health_consent_not_revoked(student_id))
    )
  );
CREATE POLICY privileged_session_requires_mfa ON public.physical_assessment_revisions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement())
  WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint
CREATE FUNCTION public.correct_physical_assessment(
  p_assessment_id uuid, p_student_id uuid, p_actor_id uuid,
  p_expected jsonb, p_changes jsonb, p_trace_id text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  original public.physical_assessments%ROWTYPE;
  corrected public.physical_assessments%ROWTYPE;
  previous_values jsonb;
  editable_keys text[] := ARRAY[
    'weight_kg','height_cm','body_fat_pct','muscle_mass_kg','notes',
    'circ_neck','circ_shoulder','circ_chest','circ_waist','circ_abdomen','circ_hip',
    'circ_right_arm','circ_left_arm','circ_right_forearm','circ_left_forearm',
    'circ_right_thigh','circ_left_thigh','circ_right_calf','circ_left_calf',
    'skinfold_chest','skinfold_abdomen','skinfold_thigh','skinfold_tricep',
    'skinfold_suprailiac','skinfold_subscapular','skinfold_midaxillary'
  ];
BEGIN
  -- A RPC só é executável pelo BFF: ator vem do JWT validado com MFA/Passkey,
  -- não do corpo. Repetir autoria/vínculo aqui fecha a corrida com desvinculação.
  SELECT * INTO original FROM public.physical_assessments
    WHERE id = p_assessment_id AND student_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'assessment_not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_actor_id IS NULL OR original.measured_by <> 'specialist'
    OR original.specialist_id IS DISTINCT FROM p_actor_id
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor_id AND account_type = 'specialist')
    OR NOT EXISTS (SELECT 1 FROM public.student_specialists WHERE student_id = p_student_id
      AND specialist_id = p_actor_id AND status = 'active')
    OR EXISTS (SELECT 1 FROM public.student_consents WHERE student_id = p_student_id
      AND consent_type = 'health_data_collection' AND revoked_at IS NOT NULL)
  THEN RAISE EXCEPTION 'assessment_correction_forbidden' USING ERRCODE = '42501'; END IF;

  SELECT jsonb_object_agg(key, value) INTO previous_values
    FROM jsonb_each(to_jsonb(original)) WHERE key = ANY(editable_keys);
  IF p_expected IS DISTINCT FROM previous_values THEN
    RAISE EXCEPTION 'assessment_correction_conflict' USING ERRCODE = '40001';
  END IF;
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_changes) key WHERE NOT key = ANY(editable_keys)
  ) THEN RAISE EXCEPTION 'invalid_assessment_fields' USING ERRCODE = '22023'; END IF;

  IF EXISTS (SELECT 1 FROM jsonb_each(p_changes) WHERE key <> 'notes'
    AND value <> 'null'::jsonb AND (jsonb_typeof(value) <> 'number'
      OR value::text::numeric < 0 OR value::text::numeric > 999.99))
    OR (p_changes ? 'notes' AND jsonb_typeof(p_changes->'notes') NOT IN ('string','null'))
    OR length(p_changes->>'notes') > 10000
  THEN RAISE EXCEPTION 'invalid_assessment_values' USING ERRCODE = '22023'; END IF;
  SELECT * INTO corrected FROM jsonb_populate_record(NULL::public.physical_assessments, to_jsonb(original) || p_changes);
  IF corrected.weight_kg IS NULL OR corrected.height_cm IS NULL
    OR corrected.weight_kg <= 0 OR corrected.height_cm <= 0
  THEN RAISE EXCEPTION 'weight_and_height_must_be_positive' USING ERRCODE = '22023'; END IF;
  IF previous_values @> p_changes THEN RETURN to_jsonb(original); END IF;

  INSERT INTO public.physical_assessment_revisions (assessment_id, student_id, corrected_by, previous_values)
    VALUES (original.id, original.student_id, p_actor_id, previous_values);
  UPDATE public.physical_assessments SET
    weight_kg = corrected.weight_kg, height_cm = corrected.height_cm,
    body_fat_pct = corrected.body_fat_pct, muscle_mass_kg = corrected.muscle_mass_kg,
    notes = corrected.notes, circ_neck = corrected.circ_neck, circ_shoulder = corrected.circ_shoulder,
    circ_chest = corrected.circ_chest, circ_waist = corrected.circ_waist,
    circ_abdomen = corrected.circ_abdomen, circ_hip = corrected.circ_hip,
    circ_right_arm = corrected.circ_right_arm, circ_left_arm = corrected.circ_left_arm,
    circ_right_forearm = corrected.circ_right_forearm, circ_left_forearm = corrected.circ_left_forearm,
    circ_right_thigh = corrected.circ_right_thigh, circ_left_thigh = corrected.circ_left_thigh,
    circ_right_calf = corrected.circ_right_calf, circ_left_calf = corrected.circ_left_calf,
    skinfold_chest = corrected.skinfold_chest, skinfold_abdomen = corrected.skinfold_abdomen,
    skinfold_thigh = corrected.skinfold_thigh, skinfold_tricep = corrected.skinfold_tricep,
    skinfold_suprailiac = corrected.skinfold_suprailiac,
    skinfold_subscapular = corrected.skinfold_subscapular, skinfold_midaxillary = corrected.skinfold_midaxillary
    WHERE id = original.id;
  -- A evidência técnica tem só metadados e segue a retenção própria da trilha.
  PERFORM public.record_security_audit_event('health.assessment.corrected', 'succeeded',
    'physical_assessment_collection', 'bff', p_actor_id, original.student_id, NULL, p_trace_id);
  RETURN to_jsonb(corrected);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.correct_physical_assessment(uuid,uuid,uuid,jsonb,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correct_physical_assessment(uuid,uuid,uuid,jsonb,jsonb,text) TO service_role;
