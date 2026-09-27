-- Ajustar não reescreve a prescrição que o aluno segue (#337).
-- O vínculo de origem permite retomar exatamente aquele ajuste, não outro
-- rascunho do mesmo aluno. Herda RLS, consentimento e retenção de diet_plans.
ALTER TABLE public.diet_plans
  ADD COLUMN source_plan_id uuid REFERENCES public.diet_plans(id) ON DELETE SET NULL,
  ADD CONSTRAINT diet_plans_source_not_self CHECK (source_plan_id IS DISTINCT FROM id);
--> statement-breakpoint

CREATE INDEX diet_plans_source_plan_id_idx ON public.diet_plans(source_plan_id);
CREATE UNIQUE INDEX diet_plans_one_draft_per_source
  ON public.diet_plans(source_plan_id) WHERE status = 'draft' AND source_plan_id IS NOT NULL;
--> statement-breakpoint

-- Nem uma escrita direta pode ligar a versão a outro titular/autor.
CREATE FUNCTION private.validate_diet_plan_source()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.source_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.diet_plans source
    WHERE source.id = NEW.source_plan_id
      AND source.student_id = NEW.student_id
      AND source.specialist_id IS NOT DISTINCT FROM NEW.specialist_id
  ) THEN
    RAISE EXCEPTION 'diet plan source % must belong to the same student and author', NEW.source_plan_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_diet_plan_source() FROM PUBLIC, anon, authenticated, service_role;
-- A eliminação da conta do autor faz SET NULL nas duas pontas; não validar no
-- meio dessa cascata, quando só uma das linhas já recebeu a alteração.
CREATE TRIGGER diet_plans_validate_source
  BEFORE INSERT OR UPDATE OF source_plan_id ON public.diet_plans
  FOR EACH ROW EXECUTE FUNCTION private.validate_diet_plan_source();
--> statement-breakpoint

-- Invoker: leitura, cópia e inserção passam pela RLS e pela trava MFA existentes.
-- A trava da origem serializa dois cliques/dispositivos; a transação impede
-- publicar um rascunho parcialmente copiado se um alimento falhar.
CREATE FUNCTION public.create_diet_plan_version(p_plan_id uuid)
RETURNS public.diet_plans LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_source public.diet_plans;
  v_draft public.diet_plans;
  v_meal public.diet_meals;
  v_meal_id uuid;
  v_actor uuid := (SELECT auth.uid());
BEGIN
  SELECT * INTO v_source FROM public.diet_plans WHERE id = p_plan_id FOR UPDATE;
  IF v_actor IS NULL OR v_source.id IS NULL OR NOT (
    v_source.specialist_id IS NOT DISTINCT FROM v_actor
    OR (v_source.specialist_id IS NULL AND v_source.student_id = v_actor)
  ) THEN
    RAISE EXCEPTION 'diet plan % not found or not writable by caller', p_plan_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_source.status = 'draft' THEN RETURN v_source; END IF;
  IF v_source.status <> 'active' THEN
    RAISE EXCEPTION 'diet plan % is %, expected active or draft', p_plan_id, v_source.status
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_draft FROM public.diet_plans
    WHERE source_plan_id = v_source.id AND status = 'draft';
  IF v_draft.id IS NOT NULL THEN RETURN v_draft; END IF;

  INSERT INTO public.diet_plans (
    student_id, specialist_id, source_plan_id, name, plan_type, status, version,
    start_date, end_date, target_calories, target_protein, target_carbs, target_fat,
    notes, dietary_restrictions, meals_per_day, allows_supplements, free_meal_days
  ) VALUES (
    v_source.student_id, v_source.specialist_id, v_source.id, v_source.name,
    v_source.plan_type, 'draft', v_source.version + 1, v_source.start_date, v_source.end_date,
    v_source.target_calories, v_source.target_protein, v_source.target_carbs, v_source.target_fat,
    v_source.notes, v_source.dietary_restrictions, v_source.meals_per_day,
    v_source.allows_supplements, v_source.free_meal_days
  ) RETURNING * INTO v_draft;

  FOR v_meal IN SELECT * FROM public.diet_meals WHERE diet_plan_id = v_source.id LOOP
    INSERT INTO public.diet_meals (
      diet_plan_id, name, meal_type, meal_order, day_of_week, meal_time,
      target_calories, prep_minutes, difficulty, servings
    ) VALUES (
      v_draft.id, v_meal.name, v_meal.meal_type, v_meal.meal_order, v_meal.day_of_week,
      v_meal.meal_time, v_meal.target_calories, v_meal.prep_minutes, v_meal.difficulty, v_meal.servings
    ) RETURNING id INTO v_meal_id;
    INSERT INTO public.diet_meal_items (diet_meal_id, food_id, quantity, unit, order_index)
      SELECT v_meal_id, food_id, quantity, unit, order_index FROM public.diet_meal_items
      WHERE diet_meal_id = v_meal.id;
  END LOOP;
  RETURN v_draft;
END;
$$;
REVOKE ALL ON FUNCTION public.create_diet_plan_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_diet_plan_version(uuid) TO authenticated;
