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

-- ── Privilégio de coluna em workout_sessions (0036) ──────────────────────────
-- A RLS decide quais LINHAS; o GRANT decide quais COLUNAS. Sem esta guarda, o
-- botão de corrigir a observação é um botão de reescrever o histórico de
-- execução: `sessions_own_update` sozinha deixa o aluno mudar `completed_at`,
-- `session_type` e `duration_seconds` da própria sessão.
--
-- Esta é a razão de o controle ser privilégio, e não trigger: privilégio é
-- declarativo e legível daqui. Trigger exigiria ler o corpo da função para
-- saber o que ela proíbe, e um bloco de verificação que lê código-fonte não
-- verifica nada.

DO $$
DECLARE
  colunas_editaveis text[] := ARRAY['feedback_edited_at', 'intensity', 'notes'];
  concedidas text[];
BEGIN
  -- Table-level UPDATE precisa ter saído: enquanto ele existir, o grant de
  -- coluna é decorativo — o privilégio da tabela cobre todas as colunas.
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'workout_sessions'
      AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  ) THEN
    RAISE EXCEPTION
      'authenticated tem UPDATE de TABELA em workout_sessions: o GRANT de coluna da 0036 não restringe nada';
  END IF;

  SELECT array_agg(DISTINCT column_name ORDER BY column_name) INTO concedidas
  FROM information_schema.role_column_grants
  WHERE table_schema = 'public' AND table_name = 'workout_sessions'
    AND grantee = 'authenticated' AND privilege_type = 'UPDATE';

  IF concedidas IS DISTINCT FROM colunas_editaveis THEN
    RAISE EXCEPTION 'UPDATE por coluna em workout_sessions é [%], esperado [%]',
      array_to_string(coalesce(concedidas, '{}'), ', '),
      array_to_string(colunas_editaveis, ', ');
  END IF;

  -- Ausência de política é o que fecha o DELETE: não existe "FOR ALL exceto
  -- DELETE". A `0017` criava `sessions_own` como FOR ALL, e foi assim que o
  -- aluno ganhou DELETE que ninguém decidiu conceder.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workout_sessions'
      AND cmd IN ('DELETE', 'ALL')
  ) THEN
    RAISE EXCEPTION 'workout_sessions voltou a ter política de DELETE (ou FOR ALL)';
  END IF;

  RAISE NOTICE 'ok  workout_sessions: UPDATE só em intensity/notes/feedback_edited_at, DELETE sem política';
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

-- ── Feedback de treino e observação de refeição ──────────────────────────────
-- `workout_sessions.notes` é o campo aberto do fim do treino, onde o aluno
-- escreve sobre dor e cirurgia: dado sensível pelo Art. 11, e não pela mesma
-- base do resto da tabela. Séries e datas já eram cobertas pelo caso acima; o
-- que este prova é que as colunas da `0035` herdaram a política — ela é por
-- linha, mas "deveria herdar" e "herdou" são coisas diferentes, e foi essa
-- distância que a auditoria de 2026-08-11 encontrou em `workout_sessions`,
-- que tinha decisão documentada e nenhuma RLS.

DO $$
DECLARE
  aluno_a uuid := gen_random_uuid();
  aluno_b uuid := gen_random_uuid();
  espec   uuid := gen_random_uuid();
  visiveis int;
  vazou    int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-fa@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-fb@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (espec,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-fe@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  -- Sessão com texto livre para os DOIS alunos: assim "zero linhas" significa
  -- bloqueio e não tabela vazia.
  INSERT INTO public.workout_sessions
    (student_id, started_at, completed_at, intensity, notes, session_type,
     duration_seconds, active_calories, activity_name)
  VALUES
    (aluno_a, now(), now(), 8, 'senti dor no ombro', 'cardio', 1920, 280, 'Corrida'),
    (aluno_b, now(), now(), 7, 'tontura no aquecimento', 'strength', NULL, NULL, NULL);

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  SET LOCAL ROLE authenticated;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO visiveis
    FROM public.workout_sessions
   WHERE student_id = aluno_a AND notes IS NOT NULL AND session_type = 'cardio'
     AND duration_seconds IS NOT NULL AND active_calories IS NOT NULL;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista vinculado não lê feedback/colunas novas do aluno A (viu %)', visiveis;
  END IF;

  SELECT count(*) INTO vazou
    FROM public.workout_sessions WHERE student_id = aluno_b;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: especialista lê % sessão(ões) do aluno B, sem vínculo', vazou;
  END IF;

  -- O aluno não lê o feedback do outro aluno.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_b, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO vazou
    FROM public.workout_sessions WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: aluno B lê % sessão(ões) do aluno A', vazou;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  feedback de treino isolado por vínculo, colunas da 0035 incluídas';
END $$;

-- ── Correção do feedback: o que o aluno pode e o que não pode (0036) ─────────
-- As quatro afirmações que sustentam a tela de correção. A fase de prova vem
-- antes da fase de tela de propósito: abrir o caminho de escrita sem a
-- restrição transforma um botão de corrigir observação num botão de reescrever
-- o histórico de execução.
--
-- O bloco estrutural acima afirma que o PRIVILÉGIO existe; este afirma que ele
-- PRODUZ o efeito. Não são o mesmo teste: um grant correto sobre uma política
-- errada ainda deixa o aluno editar a sessão do vizinho.

DO $$
DECLARE
  aluno_a  uuid := gen_random_uuid();
  aluno_b  uuid := gen_random_uuid();
  espec    uuid := gen_random_uuid();
  sessao_a uuid;
  afetadas int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ca@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-cb@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (espec,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ce@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  INSERT INTO public.workout_sessions
    (student_id, started_at, completed_at, intensity, notes, session_type)
  VALUES (aluno_a, now(), now(), 8, 'senti dor no ombro direito', 'strength')
  RETURNING id INTO sessao_a;

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);

  -- 1. O aluno corrige a própria declaração. É o direito do Art. 18, III.
  UPDATE public.workout_sessions
     SET notes = 'era o ombro esquerdo', intensity = 7, feedback_edited_at = now()
   WHERE id = sessao_a;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 1 THEN
    RAISE EXCEPTION 'aluno não consegue corrigir o próprio feedback (% linhas)', afetadas;
  END IF;

  -- 2. E não reescreve o que aconteceu. Uma coluna de medida por vez, porque
  --    um único UPDATE com as cinco não diria QUAL delas barrou.
  BEGIN
    UPDATE public.workout_sessions SET completed_at = now() - interval '3 days'
     WHERE id = sessao_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: UPDATE de completed_at foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.workout_sessions SET started_at = now() - interval '3 days'
     WHERE id = sessao_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: UPDATE de started_at foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.workout_sessions SET session_type = 'cardio' WHERE id = sessao_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: UPDATE de session_type foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.workout_sessions SET duration_seconds = 9999 WHERE id = sessao_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: UPDATE de duration_seconds foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.workout_sessions SET active_calories = 9999 WHERE id = sessao_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: UPDATE de active_calories foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 3. E não apaga a sessão. Sem política de DELETE não há exceção: a linha
  --    simplesmente não existe para o comando. Por isso a asserção é o
  --    ROW_COUNT, e não um bloco de exceção — que passaria vazio para sempre.
  DELETE FROM public.workout_sessions WHERE id = sessao_a;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'aluno APAGOU a própria sessão de treino (% linhas)', afetadas;
  END IF;

  -- 4. O especialista vinculado lê e não escreve. Terceiro editando declaração
  --    alheia não é correção, é falsificação — e o privilégio de coluna não
  --    diria nada sobre isso, porque ele vale para o papel inteiro.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  UPDATE public.workout_sessions SET notes = 'reescrito pelo personal'
   WHERE id = sessao_a;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'especialista EDITOU o feedback do aluno (% linhas)', afetadas;
  END IF;

  DELETE FROM public.workout_sessions WHERE id = sessao_a;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'especialista APAGOU a sessão do aluno (% linhas)', afetadas;
  END IF;

  -- E o aluno B, sem vínculo nenhum, também não.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_b, 'role', 'authenticated')::text, true);
  UPDATE public.workout_sessions SET notes = 'reescrito por estranho'
   WHERE id = sessao_a;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'aluno B EDITOU o feedback do aluno A (% linhas)', afetadas;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  correção: dono edita notes/intensity, ninguém edita medida, ninguém apaga sessão';
END $$;

ROLLBACK;

-- ── Métricas diárias do relógio ──────────────────────────────────────────────
-- `health_daily_metrics` é dado sensível pela `LGPD_COMPLIANCE.md` (Seção 2.2,
-- Art. 11, II, f + Art. 11, I) e era a única tabela de saúde do schema sem
-- teste de comportamento — só a checagem estrutural de que a RLS está ligada.
-- Ligada e correta são coisas diferentes: é a mesma distância que a auditoria
-- de 2026-08-11 encontrou em `workout_sessions`.
--
-- A prova vem antes das colunas da Onda 1 do relógio (sono, FC de repouso) de
-- propósito. Coluna nova herda a política, que é por linha — mas "deveria
-- herdar" e "herdou" não são a mesma afirmação, e foi por isso que as colunas
-- da 0035 ganharam teste próprio.
--
-- Linhas semeadas para os DOIS alunos: sem isso "zero linhas" significaria
-- tabela vazia, e o teste passaria com uma política que deixa todo mundo ler.

BEGIN;

DO $$
DECLARE
  aluno_a uuid := gen_random_uuid();
  aluno_b uuid := gen_random_uuid();
  espec   uuid := gen_random_uuid();
  admin   uuid := gen_random_uuid();
  visiveis int;
  vazou    int;
  afetadas int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ha@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-hb@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (espec,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-he@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb),
    (admin,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-hx@elevapro.local', '{"full_name":"X","account_type":"admin"}'::jsonb);

  -- O trigger da 0040 rebaixa `account_type = 'admin'` pedido no signup. Sem
  -- esta promoção explícita o "admin" do teste é um member, e a afirmação de
  -- que o admin não lê passaria sem nunca ter existido um admin.
  UPDATE public.profiles SET account_type = 'admin' WHERE id = admin;

  INSERT INTO public.health_daily_metrics (student_id, date, steps, active_calories)
  VALUES
    (aluno_a, current_date, 8421, 512),
    (aluno_b, current_date, 3110, 197);

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  SET LOCAL ROLE authenticated;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis
    FROM public.health_daily_metrics WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista vinculado não lê a métrica do aluno A (viu %)', visiveis;
  END IF;

  SELECT count(*) INTO vazou
    FROM public.health_daily_metrics WHERE student_id = aluno_b;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: especialista lê % dia(s) do aluno B, sem vínculo', vazou;
  END IF;

  -- Ler é tudo que o especialista pode. A métrica é medida do aparelho, e o
  -- remédio para medida inexata é medir de novo, não digitar outro número
  -- (Art. 6°, V) — mesma doutrina de `body_scans` na 0038.
  UPDATE public.health_daily_metrics SET steps = 99999 WHERE student_id = aluno_a;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: especialista alterou % dia(s) do aluno A', afetadas;
  END IF;

  -- Desvinculou, perde o acesso na mesma consulta — sem job de limpeza, sem
  -- janela de exposição.
  RESET ROLE;
  UPDATE public.student_specialists SET status = 'inactive'
   WHERE student_id = aluno_a AND specialist_id = espec;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO vazou
    FROM public.health_daily_metrics WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: especialista desvinculado ainda lê % dia(s) do aluno A', vazou;
  END IF;

  -- Um aluno não lê a rotina do outro.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_b, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO vazou
    FROM public.health_daily_metrics WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: aluno B lê % dia(s) do aluno A', vazou;
  END IF;

  -- Administrar a plataforma não inclui ler dado de saúde de ninguém
  -- (LGPD_COMPLIANCE.md, Seção 6). Afirmado lá, provado aqui.
  IF (SELECT account_type FROM public.profiles WHERE id = admin) <> 'admin' THEN
    RAISE EXCEPTION 'TESTE INVÁLIDO: a conta usada como admin não é admin';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO vazou FROM public.health_daily_metrics;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: admin lê % dia(s) de métrica de saúde', vazou;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  métricas diárias: isoladas por vínculo, imutáveis para o especialista, invisíveis ao admin';
END $$;

ROLLBACK;

-- ── Análise corporal ─────────────────────────────────────────────────────────
-- `body_scans` é chamada de "o dado mais sensível do schema" pela própria 0017,
-- e até aqui nunca teve teste de comportamento: só a checagem estrutural de que
-- a RLS está ligada. Ligada e correta são coisas diferentes — é a mesma
-- distância que a auditoria de 2026-08-11 encontrou em `workout_sessions`.
--
-- Art. 11, II, f + Art. 11, I: dado de saúde só é lido pelo titular e pelo
-- especialista com vínculo ativo. Desvinculou, perde o acesso; nunca houve
-- vínculo, nunca vê.
--
-- As linhas são semeadas para os DOIS alunos de propósito: sem isso "zero
-- linhas" significaria tabela vazia, e o teste passaria com uma política que
-- deixa todo mundo ler tudo.

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
     'verify-scan-a@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-scan-b@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (espec,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-scan-e@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  INSERT INTO public.body_scans (student_id, circ_waist)
  VALUES (aluno_a, 82), (aluno_b, 91);

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  SET LOCAL ROLE authenticated;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.body_scans WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'aluno A não lê a própria análise corporal (viu %)', visiveis;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_b, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.body_scans WHERE student_id = aluno_a;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO BIOMÉTRICO: aluno B lê % análise(s) corporal(is) do aluno A', visiveis;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.body_scans WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista vinculado não lê a análise do aluno A (viu %)', visiveis;
  END IF;

  SELECT count(*) INTO visiveis FROM public.body_scans WHERE student_id = aluno_b;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION
      'VAZAMENTO BIOMÉTRICO: especialista lê % análise(s) do aluno B, sem vínculo', visiveis;
  END IF;

  -- Ninguém edita medida gravada — nem o dono dela (Art. 6º, V).
  --
  -- Com os números virando medida do aparelho e não estimativa do modelo,
  -- adulterar passa a ter consequência: o histórico é a feature, e um valor
  -- reescrito faz a diferença entre dois scans descrever uma mudança que não
  -- aconteceu. A `0038` tirou o UPDATE de `body_scans_own`.
  --
  -- Contado e não presumido: sem RLS o UPDATE afetaria 1 linha e não levantaria
  -- erro nenhum, então "não deu erro" não é prova de nada aqui.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  UPDATE public.body_scans SET circ_waist = 60 WHERE student_id = aluno_a;
  GET DIAGNOSTICS visiveis = ROW_COUNT;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION
      'HISTÓRICO MUTÁVEL: aluno A reescreveu % medida(s) da própria análise', visiveis;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  UPDATE public.body_scans SET circ_waist = 60 WHERE student_id = aluno_a;
  GET DIAGNOSTICS visiveis = ROW_COUNT;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION
      'HISTÓRICO MUTÁVEL: especialista reescreveu % medida(s) do aluno A', visiveis;
  END IF;

  -- O DELETE continua de pé: o direito de exclusão por item (Art. 18, VI)
  -- depende dele, e estreitar a política não pode ter levado ele junto.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  DELETE FROM public.body_scans WHERE student_id = aluno_a;
  GET DIAGNOSTICS visiveis = ROW_COUNT;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'aluno A não consegue apagar a própria análise (apagou %)', visiveis;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  análise corporal: isolamento, imutabilidade e exclusão pelo titular';
END $$;

ROLLBACK;

\echo ''
\echo 'RLS verificada neste banco. Nada foi gravado.'

-- ─────────────────────────────────────────────────────────────────────────────
-- Escala: nenhuma avaliação física sem altura ou peso — Art. 6º, V
--
-- Os dois formam a Escala que calibra o Body scan. Avaliação sem eles não serve
-- de fonte, e antes da `0037` ela existia: o aluno era barrado na análise sem
-- que nada explicasse por quê, num botão de "tentar de novo" que nunca podia
-- funcionar.
--
-- A trava é sobre o dado, não sobre o privilégio: o `NOT NULL` da `0037` é o
-- controle, e este bloco afirma que ele produz o efeito. Um constraint criado
-- numa tabela e revertido por engano em outra migration não acusa sozinho.
--
-- Por que não é redundante com o constraint: uma migration futura que rode
-- `DROP NOT NULL` para "destravar um caso" passaria despercebida, e o sintoma
-- reapareceria três meses depois como "a análise não completou".
DO $$
DECLARE
  incompletas int;
BEGIN
  SELECT count(*) INTO incompletas
  FROM physical_assessments
  WHERE height_cm IS NULL OR weight_kg IS NULL;

  IF incompletas > 0 THEN
    RAISE EXCEPTION 'ESCALA QUEBRADA: % avaliação(ões) sem altura ou peso — o aluno não consegue escanear e a tela não sabe dizer por quê', incompletas;
  END IF;

  -- Afirma a ausência E a presença: um `NOT NULL` que sumiu não seria pego só
  -- pela contagem acima quando a tabela está vazia, que é o caso do ambiente
  -- limpo. Aqui a pergunta é sobre o constraint, não sobre as linhas.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'physical_assessments'
      AND column_name IN ('height_cm', 'weight_kg')
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'ESCALA QUEBRADA: altura ou peso voltou a aceitar NULL em physical_assessments';
  END IF;

  RAISE NOTICE 'ok  escala: toda avaliação física carrega altura e peso';
END $$;
