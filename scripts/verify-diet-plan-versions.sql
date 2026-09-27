-- Regressão da #337, sob RLS real. Toda fixture é descartada no ROLLBACK.
-- psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/verify-diet-plan-versions.sql
BEGIN;
DO $$
DECLARE
  student uuid := gen_random_uuid();
  specialist uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  food uuid;
  meal uuid;
  original public.diet_plans;
  draft public.diet_plans;
  resumed public.diet_plans;
  ai_meals jsonb;
  invalid_meals jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (student, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'version-student@elevapro.local', '{"full_name":"Aluno"}'),
    (specialist, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'version-author@elevapro.local', '{"full_name":"Autor"}'),
    (stranger, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'version-stranger@elevapro.local', '{"full_name":"Outro"}');
  UPDATE public.profiles SET account_type = 'specialist' WHERE id IN (specialist, stranger);
  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
    VALUES (student, specialist, 'nutrition_consulting', 'active');
  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
    VALUES (student, 'health_data_collection', now(), '1.8');
  INSERT INTO public.foods (name) VALUES ('Alimento teste versão') RETURNING id INTO food;
  INSERT INTO public.diet_plans (student_id, specialist_id, name, plan_type, status, version, notes, dietary_restrictions, start_date, end_date, target_calories)
    VALUES (student, specialist, 'Plano enviado', 'unique', 'active', 3, 'Mensagem original', ARRAY['lactose_free'], CURRENT_DATE, CURRENT_DATE + 30, 2000)
    RETURNING * INTO original;
  INSERT INTO public.diet_meals (diet_plan_id, name, meal_time, prep_minutes, difficulty, servings)
    VALUES (original.id, 'Almoço', '12:30', 15, 'facil', 2) RETURNING id INTO meal;
  INSERT INTO public.diet_meal_items (diet_meal_id, food_id, quantity, unit, order_index)
    VALUES (meal, food, 150, 'g', 1);

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT * INTO draft FROM public.create_diet_plan_version(original.id);
  IF draft.status <> 'draft' OR draft.version <> 4 OR draft.source_plan_id <> original.id
      OR draft.notes <> original.notes OR draft.dietary_restrictions <> original.dietary_restrictions THEN
    RAISE EXCEPTION 'AJUSTE INCOMPLETO: versão não preservou a prescrição do mesmo aluno';
  END IF;
  SELECT * INTO resumed FROM public.create_diet_plan_version(original.id);
  IF resumed.id <> draft.id THEN RAISE EXCEPTION 'RASCUNHO DUPLICADO: reabrir criou outro ajuste'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.diet_meals m JOIN public.diet_meal_items i ON i.diet_meal_id = m.id
    WHERE m.diet_plan_id = draft.id AND m.prep_minutes = 15 AND m.difficulty = 'facil'
      AND m.servings = 2 AND i.quantity = 150 AND i.food_id = food) THEN
    RAISE EXCEPTION 'REFEIÇÃO INCOMPLETA: ajuste perdeu preparo, porção ou alimento';
  END IF;

  ai_meals := jsonb_build_array(jsonb_build_object('name', 'Lanche IA', 'items',
    jsonb_build_array(jsonb_build_object('food_id', food, 'quantity', 100, 'unit', 'g'))));
  -- Art. 6°, VII: somente o BFF aprovado executa a operação privilegiada.
  IF has_function_privilege('authenticated', 'public.append_diet_draft_meals(uuid,uuid,uuid,jsonb)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.append_diet_draft_meals(uuid,uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'BFF CONTORNADO: cliente executou escrita privilegiada da IA';
  END IF;
  RESET ROLE;
  SET LOCAL ROLE service_role;
  PERFORM public.append_diet_draft_meals(draft.id, student, specialist, ai_meals);
  IF (SELECT count(*) FROM public.diet_meals WHERE diet_plan_id = draft.id) <> 2 THEN
    RAISE EXCEPTION 'REFEIÇÃO PERDIDA: IA substituiu a refeição que já existia';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.diet_meals WHERE diet_plan_id = draft.id AND meal_order = 1) THEN
    RAISE EXCEPTION 'ORDEM PERDIDA: IA não acrescentou depois da refeição existente';
  END IF;
  invalid_meals := ai_meals || jsonb_build_array(jsonb_build_object('name', 'Inválida', 'items',
    jsonb_build_array(jsonb_build_object('food_id', gen_random_uuid(), 'quantity', 100, 'unit', 'g'))));
  BEGIN
    PERFORM public.append_diet_draft_meals(draft.id, student, specialist, invalid_meals);
    RAISE EXCEPTION 'LOTE INVÁLIDO: IA aceitou alimento inexistente';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT count(*) FROM public.diet_meals WHERE diet_plan_id = draft.id) <> 2 THEN
    RAISE EXCEPTION 'PRESCRIÇÃO PARCIAL: lote recusado deixou refeições no rascunho';
  END IF;
  BEGIN
    PERFORM public.append_diet_draft_meals(original.id, student, specialist, ai_meals);
    RAISE EXCEPTION 'PRESCRIÇÃO AO VIVO: IA escreveu em plano enviado';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.append_diet_draft_meals(draft.id, student, stranger, ai_meals);
    RAISE EXCEPTION 'AUTORIA VIOLADA: IA escreveu para especialista sem vínculo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now() WHERE student_id = student;
  SET LOCAL ROLE service_role;
  BEGIN
    PERFORM public.append_diet_draft_meals(draft.id, student, specialist, ai_meals);
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: IA gravou após revogação';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = null WHERE student_id = student;
  SET LOCAL ROLE authenticated;
  UPDATE public.diet_plans SET target_calories = 1800 WHERE id = draft.id;
  -- Art. 6°, V: uma edição intermediária não pode mudar o que foi prescrito.
  IF (SELECT target_calories FROM public.diet_plans WHERE id = original.id) <> 2000
    OR (SELECT status FROM public.diet_plans WHERE id = original.id) <> 'active' THEN
    RAISE EXCEPTION 'PRESCRIÇÃO ALTERADA AO VIVO: editar rascunho mudou o plano enviado';
  END IF;

  -- Art. 11: o aluno lê a atual, nunca a prescrição inacabada do especialista.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', student, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  IF EXISTS (SELECT 1 FROM public.diet_plans WHERE id = draft.id) OR
    NOT EXISTS (SELECT 1 FROM public.diet_plans WHERE id = original.id) THEN
    RAISE EXCEPTION 'PRESCRIÇÃO INACABADA: aluno viu rascunho ou perdeu o plano enviado';
  END IF;
  BEGIN
    PERFORM public.create_diet_plan_version(original.id);
    RAISE EXCEPTION 'AUTORIA VIOLADA: aluno criou versão da prescrição do especialista';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  BEGIN
    PERFORM public.create_diet_plan_version(original.id);
    RAISE EXCEPTION 'VAZAMENTO: outro especialista copiou prescrição alheia';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', specialist, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  BEGIN
    PERFORM public.create_diet_plan_version(original.id);
    RAISE EXCEPTION 'MFA IGNORADO: especialista sem AAL2 abriu ajuste';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  PERFORM public.activate_diet_plan(draft.id);
  IF (SELECT status FROM public.diet_plans WHERE id = original.id) <> 'finished' THEN
    RAISE EXCEPTION 'ENVIO INCOMPLETO: versão anterior continuou ativa';
  END IF;

  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now() WHERE student_id = student;
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.create_diet_plan_version(draft.id);
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: especialista ajustou plano após revogação';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  DELETE FROM public.profiles WHERE id = specialist;
  IF EXISTS (SELECT 1 FROM public.diet_plans WHERE student_id = student AND specialist_id IS NOT NULL) THEN
    RAISE EXCEPTION 'ELIMINAÇÃO BLOQUEADA: conta apagada deixou autoria vinculada';
  END IF;
  RAISE NOTICE 'ok versões: rascunho completo, retomada, atual preservada, envio, autoria, MFA e consentimento';
END;
$$;
ROLLBACK;
