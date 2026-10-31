-- ADR-0049: foto verificada publica o prato. A revisão humana deixa de ser
-- portão; o preparo exibido é o guia genérico montado no aparelho.
CREATE OR REPLACE FUNCTION private.validate_meal_dish_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'published' AND (
    NEW.image_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.meal_dish_ingredients WHERE dish_id = NEW.id)
  ) THEN
    RAISE EXCEPTION 'dish % requires image and ingredients before publication', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.import_meal_catalog(p_catalog jsonb, p_apply boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_invalid text;
  v_new_ids text[];
  v_imaged_ids text[];
  v_assets bigint := 0;
  v_ingredients bigint := 0;
  v_published bigint := 0;
BEGIN
  IF jsonb_typeof(p_catalog->'dishes') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_catalog->'assets') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_catalog->'dishes') NOT BETWEEN 1 AND 25000 THEN
    RAISE EXCEPTION 'invalid catalog: expected dishes (1..25000) and assets arrays';
  END IF;
  -- Serializa importações; uma reexecução nunca ganha corrida contra outra.
  PERFORM pg_advisory_xact_lock(hashtextextended('meal-catalog-import-v1', 0));
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_catalog->'dishes') AS d(id text) GROUP BY id HAVING count(*) > 1)
    OR EXISTS (SELECT 1 FROM jsonb_to_recordset(p_catalog->'assets') AS a(id text) GROUP BY id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'invalid catalog: expected unique dish and asset IDs';
  END IF;
  SELECT d.id INTO v_invalid FROM jsonb_to_recordset(p_catalog->'dishes')
    AS d(id text, status text, ingredients jsonb)
    WHERE d.status IS DISTINCT FROM 'draft' OR d.id !~ '^candidate-[a-f0-9]{16}$'
      OR d.id IS NULL OR jsonb_typeof(d.ingredients) IS DISTINCT FROM 'array'
      OR jsonb_array_length(d.ingredients) NOT BETWEEN 1 AND 16 LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'invalid dish %: expected draft candidate and 1..16 ingredients', v_invalid; END IF;
  -- UUIDs do snapshot são locais ao ambiente. Apenas nome público exato e
  -- inequívoco é reconciliado; alimento particular não entra no catálogo global.
  SELECT ingredient.name INTO v_invalid
    FROM jsonb_to_recordset(p_catalog->'dishes') AS d(ingredients jsonb)
    CROSS JOIN LATERAL jsonb_array_elements_text(d.ingredients) AS ingredient(name)
    LEFT JOIN public.foods f ON f.name = ingredient.name AND f.created_by IS NULL AND NOT f.is_custom
    GROUP BY ingredient.name HAVING count(DISTINCT f.id) <> 1 LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'food % missing or ambiguous: expected one public food with exact name', v_invalid; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_catalog->'dishes') AS d(ingredients jsonb)
    WHERE jsonb_array_length(d.ingredients) <> (SELECT count(DISTINCT name) FROM jsonb_array_elements_text(d.ingredients) AS i(name))) THEN
    RAISE EXCEPTION 'invalid ingredients: expected unique food names per dish';
  END IF;
  SELECT a.id INTO v_invalid FROM jsonb_to_recordset(p_catalog->'assets')
    AS a(id text, sha256 text, storage_path text, bytes integer, version integer, verified_at timestamptz, content_type text, delivery_base_url text)
    WHERE a.id IS NULL OR a.id !~ '^photo-candidate-[a-f0-9]{16}$'
      OR a.sha256 IS NULL OR a.sha256 !~ '^[a-f0-9]{64}$'
      OR a.storage_path IS NULL OR a.storage_path !~ '^meal-images/[a-z0-9-]+\.(jpg|png|webp)$'
      OR a.bytes IS NULL OR a.bytes NOT BETWEEN 1 AND 3000000
      OR a.version IS NULL OR a.version < 1 OR a.verified_at IS NULL
      OR a.content_type IS NULL OR a.content_type NOT IN ('image/jpeg', 'image/png', 'image/webp')
      OR a.delivery_base_url IS NULL OR a.delivery_base_url !~ '^https://[^/@?#]+[^@?#]*$' LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'asset % invalid: expected verified image metadata and HTTPS origin', v_invalid; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_catalog->'dishes') AS d(id text, image_id text)
    WHERE d.image_id IS NOT NULL AND (d.image_id <> 'photo-' || d.id OR NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_catalog->'assets') AS a(id text) WHERE a.id = d.image_id))) THEN
    RAISE EXCEPTION 'invalid image relationship: expected verified asset of the same candidate';
  END IF;
  -- Identidade de asset é imutável: substituição precisa de versão explícita.
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_catalog->'assets')
    AS a(id text, sha256 text, storage_path text, version integer, bytes integer, content_type text)
    JOIN public.media_assets existing ON existing.id = a.id
    WHERE ROW(a.sha256, a.storage_path, a.version, a.bytes, a.content_type)
      IS DISTINCT FROM ROW(existing.sha256, existing.storage_path, existing.version, existing.bytes, existing.content_type)) THEN
    RAISE EXCEPTION 'asset conflict: expected immutable bytes, hash, version and path';
  END IF;
  IF NOT p_apply THEN
    RETURN jsonb_build_object('mode', 'dry-run', 'dishes', jsonb_array_length(p_catalog->'dishes'), 'images', jsonb_array_length(p_catalog->'assets'));
  END IF;
  INSERT INTO public.media_assets (id, version, storage_path, delivery_base_url, content_type, bytes, sha256, verified_at)
    SELECT id, version, storage_path, delivery_base_url, content_type, bytes, sha256, verified_at
    FROM jsonb_to_recordset(p_catalog->'assets') AS a(id text, version integer, storage_path text,
      delivery_base_url text, content_type text, bytes integer, sha256 text, verified_at timestamptz)
    ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_assets = ROW_COUNT;
  WITH inserted AS (
    INSERT INTO public.meal_dishes (id, title, template, image_id)
      SELECT id, title, template, image_id FROM jsonb_to_recordset(p_catalog->'dishes')
        AS d(id text, title text, template text, image_id text)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
  ) SELECT coalesce(array_agg(id), '{}') INTO v_new_ids FROM inserted;
  -- Completa somente vínculos ainda ausentes. Conteúdo e aprovação do revisor
  -- não são reescritos por uma nova execução do pipeline.
  INSERT INTO public.meal_dish_ingredients(dish_id, food_id, order_index)
    SELECT d.id, f.id, ingredient.ordinality - 1
    FROM jsonb_to_recordset(p_catalog->'dishes') AS d(id text, ingredients jsonb)
    JOIN public.meal_dishes existing ON existing.id = d.id AND existing.status = 'draft'
    CROSS JOIN LATERAL jsonb_array_elements_text(d.ingredients) WITH ORDINALITY AS ingredient(name, ordinality)
    JOIN public.foods f ON f.name = ingredient.name AND f.created_by IS NULL AND NOT f.is_custom
    WHERE NOT EXISTS (SELECT 1 FROM public.meal_dish_ingredients WHERE dish_id = d.id)
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_ingredients = ROW_COUNT;
  WITH imaged AS (
    UPDATE public.meal_dishes existing SET image_id = d.image_id
      FROM jsonb_to_recordset(p_catalog->'dishes') AS d(id text, image_id text)
      WHERE existing.id = d.id AND existing.status = 'draft' AND existing.image_id IS NULL AND d.image_id IS NOT NULL
      RETURNING existing.id
  ) SELECT coalesce(array_agg(id), '{}') INTO v_imaged_ids FROM imaged;
  -- Publica só o que esta execução criou ou completou com foto. Um prato que o
  -- admin devolveu a rascunho continua rascunho até ele decidir.
  UPDATE public.meal_dishes SET status = 'published'
    WHERE id = ANY(v_new_ids || v_imaged_ids) AND status = 'draft' AND image_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.meal_dish_ingredients WHERE dish_id = meal_dishes.id);
  GET DIAGNOSTICS v_published = ROW_COUNT;
  RETURN jsonb_build_object('mode', 'applied', 'insertedDishes', cardinality(v_new_ids), 'insertedImages', v_assets,
    'insertedIngredients', v_ingredients, 'publishedDishes', v_published,
    'totalDishes', (SELECT count(*) FROM public.meal_dishes), 'totalImages', (SELECT count(*) FROM public.media_assets));
END;
$$;
--> statement-breakpoint

-- Rascunhos importados antes desta regra recebem a mesma publicação, uma vez.
UPDATE public.meal_dishes SET status = 'published'
  WHERE status = 'draft' AND image_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.meal_dish_ingredients WHERE dish_id = meal_dishes.id);
