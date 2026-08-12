-- Verificação de RLS contra um banco remoto, com a connection string que o
-- workflow de migrations já usa. Sem chave de API, sem colar credencial.
--
-- Existe porque "passou no local" não prova o remoto. Local nasce de
-- `db reset`, que recria tudo com o mesmo dono; preview e produção nascem do
-- painel e recebem `db push`, que aplica só o pendente sobre objetos com outro
-- dono e outro `pg_default_acl`. A migration 0020 existe exatamente por causa
-- dessa diferença: no banco montado só pelas migrations, `authenticated` não
-- tinha nem SELECT. E `db push` responder "success" só diz que o SQL rodou.
--
-- A parte de comportamento roda dentro de uma transação que termina em
-- ROLLBACK: nada é gravado no banco verificado.
--
-- Uso: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/verify-rls.sql

\set ON_ERROR_STOP on
\timing off

-- ── Estrutura ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  sem_rls text[];
  sem_politica text[];
BEGIN
  SELECT array_agg(tablename ORDER BY tablename) INTO sem_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND NOT rowsecurity;

  IF sem_rls IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelas sem RLS: %', array_to_string(sem_rls, ', ');
  END IF;

  -- RLS ligada e sem política nega tudo, inclusive para o dono do dado:
  -- quebra silenciosa que só aparece quando o usuário abre a tela.
  SELECT array_agg(t.tablename ORDER BY t.tablename) INTO sem_politica
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = t.tablename
    );

  IF sem_politica IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelas com RLS e sem política: %', array_to_string(sem_politica, ', ');
  END IF;

  RAISE NOTICE 'ok  todas as tabelas de public têm RLS e ao menos uma política';
END $$;

DO $$
DECLARE
  com_anon text[];
  sem_auth text[];
BEGIN
  SELECT array_agg(DISTINCT table_name ORDER BY table_name) INTO com_anon
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee = 'anon';

  IF com_anon IS NOT NULL THEN
    RAISE EXCEPTION 'anon tem privilégio em: %', array_to_string(com_anon, ', ');
  END IF;

  SELECT array_agg(t.tablename ORDER BY t.tablename) INTO sem_auth
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.role_table_grants g
      WHERE g.table_schema = 'public'
        AND g.table_name = t.tablename
        AND g.grantee = 'authenticated'
    );

  -- Sem GRANT a tabela responde 401 mesmo com a política perfeita: a RLS decide
  -- quais linhas, o GRANT decide se a tabela existe para o papel.
  IF sem_auth IS NOT NULL THEN
    RAISE EXCEPTION 'authenticated sem GRANT em: %', array_to_string(sem_auth, ', ');
  END IF;

  RAISE NOTICE 'ok  anon sem privilégio; authenticated com GRANT em todas';
END $$;

DO $$
BEGIN
  -- A expressão de uma política roda com o papel de quem consulta. Sem EXECUTE
  -- para `authenticated`, toda leitura falha com 42501 em vez de lista vazia.
  IF NOT has_function_privilege(
    'authenticated', 'private.is_linked_specialist(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated não pode executar private.is_linked_specialist';
  END IF;

  IF has_function_privilege('anon', 'public.link_student_by_code(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon pode executar link_student_by_code';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'assessments' AND NOT public) THEN
    RAISE EXCEPTION 'bucket assessments ausente ou público';
  END IF;

  RAISE NOTICE 'ok  helpers com EXECUTE correto e bucket assessments privado';
END $$;

-- ── Comportamento ────────────────────────────────────────────────────────────
-- Assume o papel `authenticated` com as claims que o PostgREST injeta e afirma
-- quem enxerga o quê. Tudo dentro de uma transação que termina em ROLLBACK.

BEGIN;

DO $$
DECLARE
  aluno_a  uuid := gen_random_uuid();
  aluno_b  uuid := gen_random_uuid();
  espec    uuid := gen_random_uuid();
  visiveis int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-a@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-b@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (espec,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-e@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  -- Dado de saúde para os DOIS alunos: assim "zero linhas" significa bloqueio e
  -- não tabela vazia.
  INSERT INTO public.student_anamnesis (student_id, responses, completed_at)
  VALUES (aluno_a, '{"verificacao":true}'::jsonb, now()),
         (aluno_b, '{"verificacao":true}'::jsonb, now());

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  -- A partir daqui a sessão é um usuário comum, não o dono do banco.
  SET LOCAL ROLE authenticated;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'aluno A não lê a própria anamnese (viu %)', visiveis;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_b, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_a;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: aluno B lê % anamnese(s) do aluno A', visiveis;
  END IF;

  -- Escalonamento: criar vínculo por INSERT direto era o furo que sustentava
  -- todas as outras políticas.
  BEGIN
    INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
    VALUES (aluno_a, aluno_b, 'personal_training', 'active');
    RAISE EXCEPTION 'ESCALONAMENTO: INSERT em student_specialists foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista vinculado não lê o aluno A (viu %)', visiveis;
  END IF;

  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_b;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: especialista lê % anamnese(s) do aluno B, sem vínculo', visiveis;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  isolamento entre alunos e por vínculo, e escalonamento recusado';
END $$;

ROLLBACK;

\echo ''
\echo 'RLS verificada neste banco. Nada foi gravado.'
