-- Travas da retificação (issue #385). Sempre descartável: nenhum dado real é tocado.
BEGIN;
DO $$
DECLARE
  student_a uuid := gen_random_uuid(); student_b uuid := gen_random_uuid();
  author_a uuid := gen_random_uuid(); author_b uuid := gen_random_uuid();
  assessment_a uuid; assessment_b uuid; expected_a jsonb; expected_b jsonb;
  result jsonb; current_values jsonb; visible_count int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data) VALUES
    (student_a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated', 'correction-a-' || student_a || '@elevapro.local','{"full_name":"A","account_type":"student"}'),
    (student_b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated', 'correction-b-' || student_b || '@elevapro.local','{"full_name":"B","account_type":"student"}'),
    (author_a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated', 'correction-c-' || author_a || '@elevapro.local','{"full_name":"C","account_type":"specialist"}'),
    (author_b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated', 'correction-d-' || author_b || '@elevapro.local','{"full_name":"D","account_type":"specialist"}');
  -- Permite executar também no clone de schema, onde o trigger do Auth não vem no dump public/private.
  INSERT INTO public.profiles(id,email,full_name,account_type)
    SELECT id,email,raw_user_meta_data->>'full_name',(raw_user_meta_data->>'account_type')::public.account_type
    FROM auth.users WHERE id IN (student_a,student_b,author_a,author_b)
    ON CONFLICT(id) DO NOTHING;
  INSERT INTO public.student_consents(student_id,consent_type,given_at,policy_version) VALUES
    (student_a,'health_data_collection',now(),'1.8'),(student_b,'health_data_collection',now(),'1.8');
  INSERT INTO public.student_specialists(student_id,specialist_id,service_type,status) VALUES
    (student_a,author_a,'personal_training','active'),(student_b,author_b,'personal_training','active'),
    (student_a,author_b,'nutrition_consulting','active');
  INSERT INTO public.physical_assessments(student_id,specialist_id,weight_kg,height_cm,notes,assessed_at)
    VALUES(student_a,author_a,92,175,'Nota original','2026-10-01T12:00:00Z') RETURNING id INTO assessment_a;
  INSERT INTO public.physical_assessments(student_id,specialist_id,weight_kg,height_cm)
    VALUES(student_b,author_b,80,180) RETURNING id INTO assessment_b;
  SELECT to_jsonb(a) - ARRAY['id','student_id','specialist_id','measured_by','assessed_at','created_at']
    INTO expected_a FROM public.physical_assessments a WHERE id=assessment_a;
  SELECT to_jsonb(a) - ARRAY['id','student_id','specialist_id','measured_by','assessed_at','created_at']
    INTO expected_b FROM public.physical_assessments a WHERE id=assessment_b;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',author_a,'role','authenticated','aal','aal2')::text,true);
  IF has_function_privilege('authenticated','public.correct_physical_assessment(uuid,uuid,uuid,jsonb,jsonb,text)','EXECUTE')
    OR has_function_privilege('anon','public.correct_physical_assessment(uuid,uuid,uuid,jsonb,jsonb,text)','EXECUTE')
  THEN RAISE EXCEPTION 'BFF CONTORNADO: cliente pode executar RPC reservada ao servidor'; END IF;
  SET LOCAL ROLE service_role;
  result := public.correct_physical_assessment(assessment_a,student_a,author_a,expected_a,'{"weight_kg":91}');
  IF (result->>'id')::uuid <> assessment_a OR (result->>'weight_kg')::numeric <> 91 OR result->>'notes' <> 'Nota original'
    OR (result->>'assessed_at')::timestamptz <> '2026-10-01T12:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'CORREÇÃO PERDIDA: retificação mudou a identidade ou descartou campos';
  END IF;
  current_values := result - ARRAY['id','student_id','specialist_id','measured_by','assessed_at','created_at'];
  -- Art. 6º, V: duas abas não podem substituir silenciosamente a correção uma da outra.
  BEGIN
    PERFORM public.correct_physical_assessment(assessment_a,student_a,author_a,expected_a,'{"weight_kg":90}');
    RAISE EXCEPTION 'CORREÇÃO SOBRESCRITA: versão obsoleta foi aceita';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  -- Arts. 6º, VII e 46: autoria, aluno e origem não são editáveis nem por payload forjado.
  BEGIN
    PERFORM public.correct_physical_assessment(assessment_a,student_a,author_a,current_values,jsonb_build_object('student_id',student_b));
    RAISE EXCEPTION 'SAÚDE TRANSFERIDA: correção aceitou trocar o titular';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.correct_physical_assessment(assessment_a,student_a,author_b,current_values,'{"weight_kg":90}');
    RAISE EXCEPTION 'AUTORIA VIOLADA: outro especialista corrigiu a avaliação';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.correct_physical_assessment(assessment_a,student_a,student_a,current_values,'{"weight_kg":90}');
    RAISE EXCEPTION 'AUTORIA VIOLADA: aluno alterou avaliação profissional';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.correct_physical_assessment(assessment_b,student_b,author_b,expected_b,'{"weight_kg":79}');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',author_a,'role','authenticated','aal','aal2')::text,true);
  -- Arts. 6º, VII e 46: cliente não pode fabricar/reescrever/apagar evidência sensível.
  BEGIN
    INSERT INTO public.physical_assessment_revisions(assessment_id,student_id,previous_values) VALUES(assessment_a,student_a,'{}');
    RAISE EXCEPTION 'HISTÓRICO FORJADO: cliente inseriu versão';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.physical_assessment_revisions SET previous_values='{}' WHERE assessment_id=assessment_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: cliente alterou versão';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.physical_assessment_revisions WHERE assessment_id=assessment_a;
    RAISE EXCEPTION 'HISTÓRICO APAGADO: cliente eliminou versão';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SELECT count(*) INTO visible_count FROM public.physical_assessment_revisions
    WHERE assessment_id=assessment_a AND (previous_values->>'weight_kg')::numeric=92;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'RETIFICAÇÃO INVISÍVEL: autor não consulta versão anterior'; END IF;
  SELECT count(*) INTO visible_count FROM public.physical_assessment_revisions WHERE assessment_id=assessment_b;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'SAÚDE EXPOSTA: autor leu versão de outro aluno'; END IF;
  -- Arts. 6º, VII e 46: nem outro profissional vinculado recebe o acervo de retificação do autor.
  PERFORM set_config('request.jwt.claims',json_build_object('sub',author_b,'role','authenticated','aal','aal2')::text,true);
  SELECT count(*) INTO visible_count FROM public.physical_assessment_revisions WHERE assessment_id=assessment_a;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'SAÚDE EXPOSTA: outro autor vinculado leu a versão retificada'; END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',student_a,'role','authenticated')::text,true);
  SELECT count(*) INTO visible_count FROM public.physical_assessment_revisions;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'ACESSO DO TITULAR QUEBRADO: aluno não lê só suas versões'; END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',author_a,'role','authenticated','aal','aal1')::text,true);
  SELECT count(*) INTO visible_count FROM public.physical_assessment_revisions;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'MFA CONTORNADO: sessão sem prova leu saúde'; END IF;

  RESET ROLE;
  UPDATE public.student_consents SET revoked_at=now() WHERE student_id=student_a;
  SET LOCAL ROLE service_role;
  -- Art. 11, I: revogação fecha leitura e retificação do especialista.
  BEGIN
    PERFORM public.correct_physical_assessment(assessment_a,student_a,author_a,current_values,'{"weight_kg":90}');
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: correção após revogação foi aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',author_a,'role','authenticated','aal','aal2')::text,true);
  SELECT count(*) INTO visible_count FROM public.physical_assessment_revisions;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: versão visível após revogação'; END IF;
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at=NULL WHERE student_id=student_a;
  UPDATE public.student_specialists SET status='inactive' WHERE student_id=student_a;
  SET LOCAL ROLE service_role;
  BEGIN
    PERFORM public.correct_physical_assessment(assessment_a,student_a,author_a,current_values,'{"weight_kg":90}');
    RAISE EXCEPTION 'VÍNCULO IGNORADO: desvinculado corrigiu avaliação';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  -- Arts. 15, 16 e 18: o acervo de retificação não sobrevive à eliminação da avaliação.
  DELETE FROM public.physical_assessments WHERE id=assessment_a;
  SELECT count(*) INTO visible_count FROM public.physical_assessment_revisions WHERE assessment_id=assessment_a;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'RETENÇÃO EXCESSIVA: versão sobreviveu à eliminação da avaliação'; END IF;
  RAISE NOTICE 'ok correções: versão vigente, concorrência, autoria, consentimento, MFA, RLS e eliminação';
END;
$$;
ROLLBACK;
