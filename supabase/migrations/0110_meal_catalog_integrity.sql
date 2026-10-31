-- Uma revisão aprovada não pode perder os ingredientes ou passos por uma
-- edição posterior silenciosa: primeiro volta a rascunho, depois é revisada.
CREATE FUNCTION private.guard_meal_dish_content() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_dish_id text;
  v_step jsonb;
BEGIN
  v_dish_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.dish_id ELSE NEW.dish_id END;
  IF EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_dish_id AND status = 'published')
    OR (TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = OLD.dish_id AND status = 'published')) THEN
    RAISE EXCEPTION 'dish % is published: return to draft before editing ingredients or preparation', v_dish_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_TABLE_NAME = 'meal_dish_ingredients' THEN
    IF NOT EXISTS (SELECT 1 FROM public.foods WHERE id = NEW.food_id AND created_by IS NULL AND NOT is_custom) THEN
      RAISE EXCEPTION 'food % invalid: expected public catalog food', NEW.food_id USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  FOR v_step IN SELECT value FROM jsonb_array_elements(NEW.steps) LOOP
    IF jsonb_typeof(v_step) IS DISTINCT FROM 'object'
      OR jsonb_typeof(v_step->'instruction') IS DISTINCT FROM 'string'
      OR length(trim(v_step->>'instruction')) NOT BETWEEN 1 AND 1000
      OR (v_step ? 'timerSeconds' AND (jsonb_typeof(v_step->'timerSeconds') IS DISTINCT FROM 'number'
        OR (v_step->>'timerSeconds') !~ '^[1-9][0-9]{0,4}$' OR (v_step->>'timerSeconds')::integer > 86400)) THEN
      RAISE EXCEPTION 'dish % invalid step: expected instruction 1..1000 characters and optional timer 1..86400 seconds', v_dish_id
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_meal_dish_content() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER meal_dish_ingredients_guard BEFORE INSERT OR UPDATE OR DELETE ON public.meal_dish_ingredients
  FOR EACH ROW EXECUTE FUNCTION private.guard_meal_dish_content();
CREATE TRIGGER meal_dish_preparations_guard BEFORE INSERT OR UPDATE OR DELETE ON public.meal_dish_preparations
  FOR EACH ROW EXECUTE FUNCTION private.guard_meal_dish_content();
--> statement-breakpoint

-- A escolha deixa de corresponder quando se altera a composição. Não trocar
-- alimentos nem quantidades para manter uma sugestão antiga artificialmente.
CREATE FUNCTION private.remove_incompatible_meal_dishes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_meal_ids uuid[];
BEGIN
  v_meal_ids := CASE WHEN TG_OP = 'INSERT' THEN ARRAY[NEW.diet_meal_id]
    WHEN TG_OP = 'DELETE' THEN ARRAY[OLD.diet_meal_id] ELSE ARRAY[OLD.diet_meal_id, NEW.diet_meal_id] END;
  DELETE FROM public.diet_meal_dishes selected WHERE selected.diet_meal_id = ANY(v_meal_ids)
    AND EXISTS (SELECT 1 FROM public.meal_dish_ingredients ingredient WHERE ingredient.dish_id = selected.dish_id
      AND NOT EXISTS (SELECT 1 FROM public.diet_meal_items item
        WHERE item.diet_meal_id = selected.diet_meal_id AND item.food_id = ingredient.food_id AND item.quantity > 0));
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.remove_incompatible_meal_dishes() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER diet_meal_items_remove_incompatible_dishes AFTER INSERT OR UPDATE OR DELETE ON public.diet_meal_items
  FOR EACH ROW EXECUTE FUNCTION private.remove_incompatible_meal_dishes();
--> statement-breakpoint

-- Evidência mínima: não replica alimentos, quantidades, prato ou nome do aluno.
CREATE FUNCTION private.audit_diet_meal_dish_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_meal_id uuid;
  v_student_id uuid;
  v_now timestamptz := clock_timestamp();
BEGIN
  v_meal_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.diet_meal_id ELSE NEW.diet_meal_id END;
  SELECT dp.student_id INTO v_student_id FROM public.diet_meals dm
    JOIN public.diet_plans dp ON dp.id = dm.diet_plan_id WHERE dm.id = v_meal_id;
  INSERT INTO private.security_audit_events(occurred_at, event_type, outcome, actor_hash, subject_hash,
    resource_type, resource_id, origin, expires_at)
  VALUES (v_now, CASE WHEN TG_OP = 'DELETE' THEN 'health.meal_dish.removed' ELSE 'health.meal_dish.selected' END,
    'succeeded', private.audit_principal_hash((SELECT auth.uid())), private.audit_principal_hash(v_student_id),
    'diet_meal', private.audit_principal_hash(v_meal_id), 'database', v_now + interval '365 days');
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.audit_diet_meal_dish_change() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER diet_meal_dishes_audit_change AFTER INSERT OR DELETE ON public.diet_meal_dishes
  FOR EACH ROW EXECUTE FUNCTION private.audit_diet_meal_dish_change();
