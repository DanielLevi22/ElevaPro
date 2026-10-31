-- Travas da #366: interfaces SQL reais; fixtures desaparecem no ROLLBACK.
-- psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/verify-meal-catalog.sql
BEGIN;
\if :{?prove_negative}
-- Prova negativa: remover a barreira deve fazer a trava acusar vazamento.
CREATE POLICY meal_catalog_test_leak ON public.meal_dishes FOR SELECT TO authenticated USING (true);
\endif
DO $$
DECLARE
  v_student uuid := gen_random_uuid();
  v_stranger uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_specialist uuid := gen_random_uuid();
  v_other_specialist uuid := gen_random_uuid();
  v_food uuid;
  v_other_food uuid;
  v_plan uuid;
  v_meal uuid;
  v_dish text := 'candidate-ffffffffffffff01';
  v_draft text := 'candidate-ffffffffffffff02';
  v_photo text := 'candidate-ffffffffffffff03';
  v_catalog jsonb;
  v_result jsonb;
  v_match record;
  v_count bigint;
BEGIN
  INSERT INTO auth.users(id, instance_id, aud, role, email, raw_user_meta_data) VALUES
    (v_student, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'catalog-student@elevapro.local', '{"full_name":"Teste"}'),
    (v_stranger, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'catalog-stranger@elevapro.local', '{"full_name":"Teste"}'),
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'catalog-admin@elevapro.local', '{"full_name":"Teste"}'),
    (v_specialist, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'catalog-author@elevapro.local', '{"full_name":"Teste"}'),
    (v_other_specialist, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'catalog-other-author@elevapro.local', '{"full_name":"Teste"}');
  UPDATE public.profiles SET account_type = 'admin' WHERE id = v_admin;
  UPDATE public.profiles SET account_type = 'specialist' WHERE id IN (v_specialist, v_other_specialist);
  INSERT INTO public.foods(name, category) VALUES ('Catalog test rice', 'carboidrato') RETURNING id INTO v_food;
  INSERT INTO public.foods(name, category) VALUES ('Catalog test side', 'hortalica') RETURNING id INTO v_other_food;
  v_catalog := jsonb_build_object('dishes', jsonb_build_array(
    jsonb_build_object('id', v_dish, 'title', 'Prato de teste', 'template', 'savory_plate', 'status', 'draft', 'ingredients', jsonb_build_array('Catalog test rice')),
    jsonb_build_object('id', v_draft, 'title', 'Rascunho de teste', 'template', 'savory_plate', 'status', 'draft', 'ingredients', jsonb_build_array('Catalog test side')),
    jsonb_build_object('id', v_photo, 'title', 'Prato com foto', 'template', 'savory_plate', 'status', 'draft', 'image_id', 'photo-' || v_photo,
      'ingredients', jsonb_build_array('Catalog test rice', 'Catalog test side'))
  ), 'assets', jsonb_build_array(jsonb_build_object('id', 'photo-' || v_photo, 'version', 1, 'storage_path', 'meal-images/test-catalog-03.jpg',
    'delivery_base_url', 'https://example.com', 'content_type', 'image/jpeg', 'bytes', 10, 'sha256', repeat('b', 64), 'verified_at', now())));
  v_result := public.import_meal_catalog(v_catalog, false);
  IF EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_dish) THEN RAISE EXCEPTION 'DRY-RUN ESCREVEU: simulação alterou catálogo'; END IF;
  v_result := public.import_meal_catalog(v_catalog, true);
  IF (v_result->>'insertedDishes')::integer <> 3 THEN RAISE EXCEPTION 'IMPORTAÇÃO INCOMPLETA: não cadastrou os três pratos'; END IF;
  -- ADR-0049: foto verificada publica; sem foto o prato segue rascunho.
  IF NOT EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_photo AND status = 'published') THEN
    RAISE EXCEPTION 'FOTO SEM PUBLICAÇÃO: prato com imagem verificada continuou rascunho';
  END IF;
  IF EXISTS (SELECT 1 FROM public.meal_dishes WHERE id IN (v_dish, v_draft) AND status <> 'draft') THEN
    RAISE EXCEPTION 'PUBLICAÇÃO SEM FOTO: prato sem imagem saiu de rascunho';
  END IF;
  UPDATE public.meal_dishes SET status = 'draft' WHERE id = v_photo;
  v_result := public.import_meal_catalog(v_catalog, true);
  IF (v_result->>'insertedDishes')::integer <> 0 OR (v_result->>'insertedIngredients')::integer <> 0 THEN
    RAISE EXCEPTION 'CATÁLOGO DUPLICADO: reexecução inseriu pratos ou ingredientes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_photo AND status = 'draft') THEN
    RAISE EXCEPTION 'DECISÃO DO ADMIN DESFEITA: reexecução republicou prato devolvido a rascunho';
  END IF;
  UPDATE public.meal_dishes SET status = 'archived' WHERE id = v_photo;
  BEGIN
    PERFORM public.import_meal_catalog(jsonb_set(v_catalog, '{dishes,1,ingredients}', '["Catalog nonexistent food"]'), true);
    RAISE EXCEPTION 'ALIMENTO INVENTADO: importação aceitou nome inexistente';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'food % missing or ambiguous:%' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_draft) THEN RAISE EXCEPTION 'ROLLBACK INCOMPLETO: importação inválida alterou prato existente'; END IF;
  BEGIN
    UPDATE public.meal_dishes SET status = 'published' WHERE id = v_dish;
    RAISE EXCEPTION 'PRATO SEM FOTO: prato incompleto foi publicado';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO public.media_assets(id, version, storage_path, delivery_base_url, content_type, bytes, sha256, verified_at)
    VALUES ('photo-candidate-ffffffffffffff01', 1, 'meal-images/test-catalog.jpg', 'https://example.com', 'image/jpeg', 10, repeat('a', 64), now());
  INSERT INTO public.meal_dish_preparations(dish_id, title, minutes, equipment, steps)
    VALUES (v_dish, 'Preparo de teste', 5, 'Panela', '[{"instruction":"Passo de teste"}]');
  UPDATE public.meal_dishes SET image_id = 'photo-candidate-ffffffffffffff01', title = 'Título revisado', status = 'published' WHERE id = v_dish;
  PERFORM public.import_meal_catalog(v_catalog, true);
  IF NOT EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_dish AND title = 'Título revisado' AND status = 'published') THEN
    RAISE EXCEPTION 'REVISÃO PERDIDA: importação reescreveu título ou aprovação';
  END IF;
  INSERT INTO public.student_consents(student_id, consent_type, given_at, policy_version)
    VALUES (v_student, 'health_data_collection', now(), '1.8');
  INSERT INTO public.diet_plans(student_id, plan_type, status, start_date, end_date)
    VALUES (v_student, 'unique', 'draft', CURRENT_DATE, CURRENT_DATE + 30) RETURNING id INTO v_plan;
  INSERT INTO public.diet_meals(diet_plan_id, name) VALUES (v_plan, 'Teste') RETURNING id INTO v_meal;
  INSERT INTO public.diet_meal_items(diet_meal_id, food_id, quantity, unit) VALUES (v_meal, v_food, 100, 'g');
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  -- Art. 6º VII: conteúdo ainda não revisado não deve parecer prescrição pronta.
  IF EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_draft) THEN RAISE EXCEPTION 'RASCUNHO EXPOSTO: leitor recebeu prato não aprovado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_dish) THEN RAISE EXCEPTION 'CATÁLOGO INACESSÍVEL: leitor não recebeu prato publicado'; END IF;
  BEGIN
    INSERT INTO public.meal_dishes(id, title, template) VALUES ('unauthorized', 'Teste', 'savory_plate');
    RAISE EXCEPTION 'CATÁLOGO CORROMPIDO: aluno conseguiu cadastrar prato';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Art. 6º VII: o cliente não recebe o privilégio de importação. A imagem
  -- Supabase 17.6.1.104 derruba o backend ao executar RPC revogada sob
  -- supautils.hint_roles (supabase/postgres#2112); conferir o privilégio efetivo
  -- evita provocar o defeito de infraestrutura, sem relaxar o grant.
  IF has_function_privilege(current_user, 'public.import_meal_catalog(jsonb,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'IMPORTAÇÃO EXPOSTA: cliente recebeu privilégio de seed';
  END IF;
  SELECT * INTO v_match FROM public.match_meal_dishes(ARRAY[v_food]);
  IF v_match.dish_id <> v_dish OR v_match.exact_match IS DISTINCT FROM true THEN RAISE EXCEPTION 'OPÇÃO EXATA AUSENTE: composição igual não correspondeu'; END IF;
  SELECT * INTO v_match FROM public.match_meal_dishes(ARRAY[v_food, v_other_food]);
  IF v_match.exact_match IS DISTINCT FROM false OR v_match.remaining_food_ids <> ARRAY[v_other_food] THEN RAISE EXCEPTION 'ACOMPANHAMENTO OCULTO: composição restante não foi explicitada'; END IF;
  SELECT count(*) INTO v_count FROM public.match_meal_dishes(ARRAY[v_other_food]);
  IF v_count <> 0 THEN RAISE EXCEPTION 'INGREDIENTE INVENTADO: busca aceitou prato sem alimento obrigatório'; END IF;
  INSERT INTO public.diet_meal_dishes(diet_meal_id, dish_id) VALUES (v_meal, v_dish);
  -- Art. 11 e 46: escolhas individualizadas não atravessam titulares.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_stranger, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  IF EXISTS (SELECT 1 FROM public.diet_meal_dishes WHERE diet_meal_id = v_meal) THEN RAISE EXCEPTION 'DIETA EXPOSTA: outro aluno recebeu a escolha'; END IF;
  BEGIN
    INSERT INTO public.diet_meal_dishes(diet_meal_id, dish_id) VALUES (v_meal, v_draft);
    RAISE EXCEPTION 'DIETA REESCRITA: outro aluno inseriu escolha';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  IF EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_draft) THEN RAISE EXCEPTION 'MFA IGNORADO: admin aal1 recebeu rascunho'; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  IF NOT EXISTS (SELECT 1 FROM public.meal_dishes WHERE id = v_draft) THEN RAISE EXCEPTION 'REVISÃO BLOQUEADA: admin aal2 não recebeu rascunho'; END IF;
  UPDATE public.meal_dishes SET title = 'Rascunho revisado' WHERE id = v_draft;
  RESET ROLE;
  BEGIN
    DELETE FROM public.meal_dish_preparations WHERE dish_id = v_dish;
    RAISE EXCEPTION 'PREPARO PERDIDO: prato publicado perdeu instruções';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE public.diet_meal_items SET quantity = 0 WHERE diet_meal_id = v_meal;
  IF EXISTS (SELECT 1 FROM public.diet_meal_dishes WHERE diet_meal_id = v_meal) THEN RAISE EXCEPTION 'ESCOLHA INCOMPATÍVEL: alimento removido continuou sugerindo prato'; END IF;
  UPDATE public.diet_meal_items SET quantity = 100 WHERE diet_meal_id = v_meal;
  UPDATE public.diet_plans SET specialist_id = v_specialist WHERE id = v_plan;
  INSERT INTO public.student_specialists(student_id, specialist_id, service_type, status)
    VALUES (v_student, v_specialist, 'nutrition_consulting', 'active');
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  INSERT INTO public.diet_meal_dishes(diet_meal_id, dish_id) VALUES (v_meal, v_dish);
  IF NOT EXISTS (SELECT 1 FROM public.diet_meal_dishes WHERE diet_meal_id = v_meal) THEN RAISE EXCEPTION 'AUTOR BLOQUEADO: profissional vinculado não recebeu escolha'; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other_specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  IF EXISTS (SELECT 1 FROM public.diet_meal_dishes WHERE diet_meal_id = v_meal) THEN RAISE EXCEPTION 'AUTORIA VIOLADA: outro especialista recebeu escolha'; END IF;
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now() WHERE student_id = v_student;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  -- Art. 11 I: revogar o consentimento fecha o compartilhamento da escolha.
  IF EXISTS (SELECT 1 FROM public.diet_meal_dishes WHERE diet_meal_id = v_meal) THEN RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: autor recebeu escolha após revogação'; END IF;
  RESET ROLE;
  DELETE FROM public.diet_meals WHERE id = v_meal;
  -- Art. 18 VI: eliminar refeição elimina sua escolha, sem acervo paralelo.
  IF EXISTS (SELECT 1 FROM public.diet_meal_dishes WHERE diet_meal_id = v_meal) THEN RAISE EXCEPTION 'ESCOLHA RETIDA: eliminação da refeição deixou vínculo'; END IF;
  RAISE NOTICE 'Catálogo: importação, busca, RLS, MFA, revisão e cascata verificados';
END;
$$;
ROLLBACK;
