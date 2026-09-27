-- A aprovação da IA disputa a mesma trava de activate_diet_plan: ou o lote
-- inteiro entra antes do envio, ou não entra nada no plano já enviado (#337).
-- Somente o BFF autorizado (MFA/vínculo) pode executar; não expõe escrita
-- service_role a clientes authenticated. Sem tabela ou dado pessoal novo.
CREATE FUNCTION public.append_diet_draft_meals(
  p_plan_id uuid, p_student_id uuid, p_specialist_id uuid, p_meals jsonb
)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_plan public.diet_plans;
  v_meal jsonb;
  v_item jsonb;
  v_meal_id uuid;
  v_day integer;
  v_order integer;
  v_item_order integer;
BEGIN
  -- Ordem de travas compatível com a eliminação de rascunhos ao encerrar vínculo.
  PERFORM 1 FROM public.student_specialists
    WHERE student_id = p_student_id AND specialist_id = p_specialist_id AND status = 'active'
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student % requires an active link to specialist %', p_student_id, p_specialist_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM 1 FROM public.student_consents
    WHERE student_id = p_student_id AND consent_type = 'health_data_collection'
      AND given_at IS NOT NULL AND revoked_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student % requires current health consent', p_student_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_plan FROM public.diet_plans WHERE diet_plans.id = p_plan_id FOR UPDATE;
  IF v_plan.id IS NULL OR v_plan.student_id IS DISTINCT FROM p_student_id
      OR v_plan.specialist_id IS DISTINCT FROM p_specialist_id OR v_plan.status <> 'draft' THEN
    RAISE EXCEPTION 'diet plan % must be an authorized draft', p_plan_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF jsonb_typeof(p_meals) IS DISTINCT FROM 'array' OR jsonb_array_length(p_meals) = 0 THEN
    RAISE EXCEPTION 'meals must be a nonempty array' USING ERRCODE = 'check_violation';
  END IF;

  FOR v_meal IN SELECT value FROM jsonb_array_elements(p_meals) LOOP
    v_day := (v_meal->>'day_of_week')::integer;
    IF (v_plan.plan_type = 'unique' AND v_day IS NOT NULL)
      OR (v_plan.plan_type = 'cyclic' AND (v_day IS NULL OR v_day NOT BETWEEN 0 AND 6))
      OR coalesce(trim(v_meal->>'name'), '') = ''
      OR jsonb_typeof(v_meal->'items') IS DISTINCT FROM 'array'
      OR jsonb_array_length(v_meal->'items') = 0 THEN
      RAISE EXCEPTION 'meal must have a name, items and day matching plan type %', v_plan.plan_type
        USING ERRCODE = 'check_violation';
    END IF;
    SELECT coalesce(max(m.meal_order), -1) + 1 INTO v_order FROM public.diet_meals m
      WHERE m.diet_plan_id = p_plan_id AND m.day_of_week IS NOT DISTINCT FROM v_day;
    INSERT INTO public.diet_meals (diet_plan_id, name, meal_time, day_of_week, meal_order)
      VALUES (p_plan_id, v_meal->>'name', (v_meal->>'meal_time')::time, v_day, v_order)
      RETURNING diet_meals.id INTO v_meal_id;
    v_item_order := 0;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_meal->'items') LOOP
      IF coalesce((v_item->>'quantity')::numeric, 0) <= 0
        OR coalesce(trim(v_item->>'unit'), '') = '' OR NOT EXISTS (
          SELECT 1 FROM public.foods f WHERE f.id = (v_item->>'food_id')::uuid
            AND (NOT f.is_custom OR f.created_by = p_specialist_id)
        ) THEN
        RAISE EXCEPTION 'meal item requires an accessible food, positive quantity and unit'
          USING ERRCODE = 'check_violation';
      END IF;
      INSERT INTO public.diet_meal_items (diet_meal_id, food_id, quantity, unit, order_index)
        VALUES (v_meal_id, (v_item->>'food_id')::uuid, (v_item->>'quantity')::numeric,
          v_item->>'unit', v_item_order);
      v_item_order := v_item_order + 1;
    END LOOP;
    id := v_meal_id;
    name := v_meal->>'name';
    RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.append_diet_draft_meals(uuid, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_diet_draft_meals(uuid, uuid, uuid, jsonb) TO service_role;
