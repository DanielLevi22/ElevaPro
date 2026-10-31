-- Selecionar um prato e alterar alimentos em dois dispositivos precisam
-- disputar a mesma trava; só conferir no trigger não fecha essa corrida.
CREATE FUNCTION private.lock_meal_dish_composition() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_meal_ids uuid[];
BEGIN
  v_meal_ids := CASE WHEN TG_OP = 'INSERT' THEN ARRAY[NEW.diet_meal_id]
    WHEN TG_OP = 'DELETE' THEN ARRAY[OLD.diet_meal_id] ELSE ARRAY[OLD.diet_meal_id, NEW.diet_meal_id] END;
  PERFORM id FROM public.diet_meals WHERE id = ANY(v_meal_ids) ORDER BY id FOR UPDATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.lock_meal_dish_composition() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER diet_meal_dishes_aaa_lock_composition BEFORE INSERT OR DELETE ON public.diet_meal_dishes
  FOR EACH ROW EXECUTE FUNCTION private.lock_meal_dish_composition();
CREATE TRIGGER diet_meal_items_aaa_lock_composition BEFORE INSERT OR UPDATE OR DELETE ON public.diet_meal_items
  FOR EACH ROW EXECUTE FUNCTION private.lock_meal_dish_composition();

-- Publicação e edição dos filhos também compartilham a trava do prato.
CREATE FUNCTION private.lock_meal_dish_content() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_dish_ids text[];
BEGIN
  v_dish_ids := CASE WHEN TG_OP = 'INSERT' THEN ARRAY[NEW.dish_id]
    WHEN TG_OP = 'DELETE' THEN ARRAY[OLD.dish_id] ELSE ARRAY[OLD.dish_id, NEW.dish_id] END;
  PERFORM id FROM public.meal_dishes WHERE id = ANY(v_dish_ids) ORDER BY id FOR UPDATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.lock_meal_dish_content() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER meal_dish_ingredients_aaa_lock BEFORE INSERT OR UPDATE OR DELETE ON public.meal_dish_ingredients
  FOR EACH ROW EXECUTE FUNCTION private.lock_meal_dish_content();
CREATE TRIGGER meal_dish_preparations_aaa_lock BEFORE INSERT OR UPDATE OR DELETE ON public.meal_dish_preparations
  FOR EACH ROW EXECUTE FUNCTION private.lock_meal_dish_content();
