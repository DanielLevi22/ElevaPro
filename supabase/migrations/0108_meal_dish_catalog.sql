-- Catálogo genérico não contém dieta de titular. Só o vínculo diet_meal_dishes
-- é dado individual; sua leitura/escrita herda a autorização do plano (#366).
CREATE TABLE public.media_assets (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  version integer NOT NULL CHECK (version > 0),
  storage_path text NOT NULL UNIQUE CHECK (storage_path ~ '^meal-images/[a-z0-9-]+\.(jpg|png|webp)$'),
  delivery_base_url text NOT NULL CHECK (delivery_base_url ~ '^https://[^/@?#]+[^@?#]*$'),
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 3000000),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.meal_dishes (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
  description text CHECK (length(description) <= 1000),
  template text NOT NULL CHECK (template IN ('savory_plate', 'legume_plate', 'sandwich', 'yogurt_bowl', 'smoothie', 'porridge', 'seasoned_side', 'snack_plate', 'paired_drink', 'protein_drink')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  image_id text REFERENCES public.media_assets(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meal_dishes_image_id_idx ON public.meal_dishes(image_id);
CREATE INDEX meal_dishes_status_id_idx ON public.meal_dishes(status, id);
CREATE TABLE public.meal_dish_ingredients (
  dish_id text NOT NULL REFERENCES public.meal_dishes(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
  order_index integer NOT NULL CHECK (order_index >= 0),
  PRIMARY KEY(dish_id, food_id), UNIQUE(dish_id, order_index)
);
CREATE INDEX meal_dish_ingredients_food_id_idx ON public.meal_dish_ingredients(food_id, dish_id);
CREATE TABLE public.meal_dish_preparations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id text NOT NULL REFERENCES public.meal_dishes(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  minutes integer NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
  equipment text NOT NULL CHECK (length(trim(equipment)) BETWEEN 1 AND 200),
  steps jsonb NOT NULL CHECK (jsonb_typeof(steps) = 'array' AND jsonb_array_length(steps) BETWEEN 1 AND 50)
);
CREATE INDEX meal_dish_preparations_dish_id_idx ON public.meal_dish_preparations(dish_id);
CREATE TABLE public.diet_meal_dishes (
  diet_meal_id uuid NOT NULL REFERENCES public.diet_meals(id) ON DELETE CASCADE,
  dish_id text NOT NULL REFERENCES public.meal_dishes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(diet_meal_id, dish_id)
);
CREATE INDEX diet_meal_dishes_dish_id_idx ON public.diet_meal_dishes(dish_id);
--> statement-breakpoint

-- Papel e MFA saem da sessão confiável, nunca do payload de importação.
CREATE FUNCTION private.can_manage_meal_catalog() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND account_type = 'admin' AND account_status = 'active')
    AND private.current_session_meets_mfa_requirement();
$$;
REVOKE ALL ON FUNCTION private.can_manage_meal_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_meal_catalog() TO authenticated;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_dish_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_dish_preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_meal_dishes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.media_assets, public.meal_dishes, public.meal_dish_ingredients,
  public.meal_dish_preparations, public.diet_meal_dishes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets, public.meal_dishes,
  public.meal_dish_ingredients, public.meal_dish_preparations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.diet_meal_dishes TO authenticated;
GRANT ALL ON public.media_assets, public.meal_dishes, public.meal_dish_ingredients,
  public.meal_dish_preparations, public.diet_meal_dishes TO service_role;

CREATE POLICY meal_dishes_read ON public.meal_dishes FOR SELECT TO authenticated
  USING (status = 'published' OR (SELECT private.can_manage_meal_catalog()));
CREATE POLICY meal_dishes_admin ON public.meal_dishes FOR ALL TO authenticated
  USING ((SELECT private.can_manage_meal_catalog())) WITH CHECK ((SELECT private.can_manage_meal_catalog()));
CREATE POLICY media_assets_read ON public.media_assets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_dishes WHERE image_id = media_assets.id AND status = 'published')
    OR (SELECT private.can_manage_meal_catalog()));
CREATE POLICY media_assets_admin ON public.media_assets FOR ALL TO authenticated
  USING ((SELECT private.can_manage_meal_catalog())) WITH CHECK ((SELECT private.can_manage_meal_catalog()));
CREATE POLICY meal_dish_ingredients_read ON public.meal_dish_ingredients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = dish_id));
CREATE POLICY meal_dish_ingredients_admin ON public.meal_dish_ingredients FOR ALL TO authenticated
  USING ((SELECT private.can_manage_meal_catalog())) WITH CHECK ((SELECT private.can_manage_meal_catalog()));
CREATE POLICY meal_dish_preparations_read ON public.meal_dish_preparations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = dish_id));
CREATE POLICY meal_dish_preparations_admin ON public.meal_dish_preparations FOR ALL TO authenticated
  USING ((SELECT private.can_manage_meal_catalog())) WITH CHECK ((SELECT private.can_manage_meal_catalog()));

CREATE POLICY diet_meal_dishes_read ON public.diet_meal_dishes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diet_meals WHERE id = diet_meal_id));
CREATE POLICY diet_meal_dishes_insert ON public.diet_meal_dishes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.diet_meals dm JOIN public.diet_plans dp ON dp.id = dm.diet_plan_id
    WHERE dm.id = diet_meal_id AND (
      (dp.specialist_id = (SELECT auth.uid()) AND private.is_linked_specialist(dp.student_id)
        AND private.has_health_consent(dp.student_id))
      OR (dp.specialist_id IS NULL AND dp.student_id = (SELECT auth.uid())
        AND private.has_health_consent(dp.student_id))
    )
  ));
CREATE POLICY diet_meal_dishes_delete ON public.diet_meal_dishes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.diet_meals dm JOIN public.diet_plans dp ON dp.id = dm.diet_plan_id
    WHERE dm.id = diet_meal_id AND (
      (dp.specialist_id = (SELECT auth.uid()) AND private.is_linked_specialist(dp.student_id)
        AND private.health_consent_not_revoked(dp.student_id))
      OR (dp.specialist_id IS NULL AND dp.student_id = (SELECT auth.uid()))
    )
  ));

-- A migration 0067 só alcança tabelas que já existiam na época.
CREATE POLICY privileged_session_requires_mfa ON public.media_assets AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement()) WITH CHECK (private.current_session_meets_mfa_requirement());
CREATE POLICY privileged_session_requires_mfa ON public.meal_dishes AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement()) WITH CHECK (private.current_session_meets_mfa_requirement());
CREATE POLICY privileged_session_requires_mfa ON public.meal_dish_ingredients AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement()) WITH CHECK (private.current_session_meets_mfa_requirement());
CREATE POLICY privileged_session_requires_mfa ON public.meal_dish_preparations AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement()) WITH CHECK (private.current_session_meets_mfa_requirement());
CREATE POLICY privileged_session_requires_mfa ON public.diet_meal_dishes AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement()) WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint

-- Foto pronta não comprova receita pronta: publicação exige conteúdo revisado.
CREATE FUNCTION private.validate_meal_dish_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'published' AND (
    NEW.image_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.meal_dish_ingredients WHERE dish_id = NEW.id)
    OR NOT EXISTS (SELECT 1 FROM public.meal_dish_preparations WHERE dish_id = NEW.id)
  ) THEN
    RAISE EXCEPTION 'dish % requires image, ingredients and preparation before publication', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_meal_dish_publication() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER meal_dishes_validate_publication BEFORE INSERT OR UPDATE ON public.meal_dishes
  FOR EACH ROW EXECUTE FUNCTION private.validate_meal_dish_publication();

-- Uma escrita direta também deve recusar escolha incompatível ou não publicada.
CREATE FUNCTION private.validate_diet_meal_dish() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = NEW.dish_id AND status = 'published')
    OR NOT EXISTS (SELECT 1 FROM public.meal_dish_ingredients WHERE dish_id = NEW.dish_id)
    OR EXISTS (SELECT 1 FROM public.meal_dish_ingredients ingredient WHERE dish_id = NEW.dish_id
      AND NOT EXISTS (SELECT 1 FROM public.diet_meal_items item
        WHERE item.diet_meal_id = NEW.diet_meal_id AND item.food_id = ingredient.food_id AND item.quantity > 0)) THEN
    RAISE EXCEPTION 'dish % is not published or lacks ingredients in meal %', NEW.dish_id, NEW.diet_meal_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_diet_meal_dish() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER diet_meal_dishes_validate BEFORE INSERT ON public.diet_meal_dishes
  FOR EACH ROW EXECUTE FUNCTION private.validate_diet_meal_dish();
