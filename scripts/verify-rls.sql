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
  colunas_editaveis text[] := ARRAY['feedback_edited_at', 'notes', 'perceived_exertion'];
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

  RAISE NOTICE 'ok  workout_sessions: UPDATE só em perceived_exertion/notes/feedback_edited_at, DELETE sem política';
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

-- ── Faixas de plausibilidade do relógio (0046) ───────────────────────────────
-- HealthKit e Health Connect medem sono em unidades diferentes, e um valor em
-- segundos gravado como minutos passaria despercebido para sempre — vira "o
-- aluno dormiu 8 dias". O CHECK é a única barreira depois que o dado sai do
-- aparelho, e por isso a existência dele é afirmada aqui, não só a ausência de
-- linha absurda: num banco vazio, contar linhas fora da faixa passa sozinho.

DO $$
DECLARE
  ausentes text[];
BEGIN
  SELECT array_agg(esperado ORDER BY esperado) INTO ausentes
  FROM unnest(ARRAY['health_daily_metrics_sleep_minutes_plausible',
                    'health_daily_metrics_resting_hr_plausible']) AS esperado
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'health_daily_metrics' AND c.conname = esperado
  );

  IF ausentes IS NOT NULL THEN
    RAISE EXCEPTION 'ERRO DE UNIDADE SEM BARREIRA: CHECK ausente em health_daily_metrics: %',
      array_to_string(ausentes, ', ');
  END IF;

  RAISE NOTICE 'ok  sono e FC de repouso com faixa de plausibilidade no banco';
END $$;

-- ── Toda tabela de Art. 11 confere o consentimento; nenhuma de Art. 7° confere ──
--
-- As travas de comportamento abaixo provam tabela a tabela. Esta prova a
-- **regra**, e é a que alcança a tabela que ainda não existe: dado de saúde
-- nascendo com política de especialista que só olha o vínculo é o defeito que
-- a 0043 encontrou em health_daily_metrics, e ele reaparece toda vez que
-- alguém copia uma política existente sem saber qual copiar.
--
-- O critério é a BASE LEGAL, não o vínculo. Art. 11 pede tutela da saúde MAIS
-- consentimento, então revogar derruba o acesso. Art. 7°, V é o serviço que o
-- aluno contratou: somar a checagem ali desligaria a prescrição de treino e
-- apagaria o aluno do painel sem ganho jurídico nenhum. O caminho para encerrar
-- essas é encerrar o vínculo.
--
-- Mexer numa das listas é mexer na classificação da `LGPD_COMPLIANCE.md` §2.2.
-- Se for essa a intenção, o documento muda junto — não só esta lista.

DO $$
DECLARE
  saude       text[] := ARRAY['health_daily_metrics','meal_logs','physical_assessments',
                              'student_anamnesis','body_scans','workout_session_vitals',
                              'hydration_daily'];
  contrato    text[] := ARRAY['profiles','specialist_services','workout_sessions',
                              'workout_session_sets','workout_session_exercises',
                              'achievements','daily_goals','student_streaks'];
  faltando    text[];
  sobrando    text[];
BEGIN
  -- Art. 11 sem a checagem: dado de saúde que sobrevive à revogação.
  SELECT array_agg(DISTINCT t ORDER BY t) INTO faltando
  FROM unnest(saude) AS t
  WHERE EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = t
      AND (COALESCE(p.qual,'') || COALESCE(p.with_check,'')) ~ 'is_linked_specialist|student_specialists'
      AND (COALESCE(p.qual,'') || COALESCE(p.with_check,'')) !~ 'consent'
  );

  IF faltando IS NOT NULL THEN
    RAISE EXCEPTION 'REVOGAÇÃO SEM EFEITO: tabela(s) de Art. 11 com acesso do especialista que ignora o consentimento: %',
      array_to_string(faltando, ', ');
  END IF;

  -- Art. 7° COM a checagem: serviço contratado desligado por revogação.
  SELECT array_agg(DISTINCT t ORDER BY t) INTO sobrando
  FROM unnest(contrato) AS t
  WHERE EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = t
      AND (COALESCE(p.qual,'') || COALESCE(p.with_check,'')) ~ 'is_linked_specialist|student_specialists'
      AND (COALESCE(p.qual,'') || COALESCE(p.with_check,'')) ~ 'consent'
  );

  IF sobrando IS NOT NULL THEN
    RAISE EXCEPTION 'SERVIÇO DESLIGADO POR REVOGAÇÃO: tabela(s) de execução de contrato que passaram a exigir consentimento: %',
      array_to_string(sobrando, ', ');
  END IF;

  RAISE NOTICE 'ok  Art. 11 confere consentimento em 7 tabelas; Art. 7° não confere em 8';
END $$;

-- ── Nenhuma coordenada, em tabela nenhuma (0049) ─────────────────────────────
-- A #278 decidiu que a corrida grava distância e ritmo, e **não** o caminho: a
-- série de posições revela endereço de casa, janela previsível de ausência e os
-- lugares que a pessoa frequenta, sem mudar nenhuma decisão de prescrição. É a
-- mesma minimização que tirou horário de dormir e acordar da `0046`.
--
-- Esta guarda varre o schema INTEIRO, e não uma lista de tabelas, porque a
-- decisão precisa alcançar a tabela que ainda não existe — é o modo como o
-- defeito da `0043` reapareceu: alguém copia um desenho sem saber qual copiar.
-- Sem ela, "não persistir coordenada" seria decisão em documento e o banco
-- ficaria livre para contradizê-la, que é exatamente o que a auditoria de
-- 2026-08-11 encontrou em `workout_sessions`.

DO $$
DECLARE
  geograficas text;
BEGIN
  SELECT string_agg(format('%s.%s', table_name, column_name), ', ' ORDER BY table_name)
    INTO geograficas
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      column_name ~* '(latitude|longitude|^lat$|^lng$|^lon$|coordinate|polyline|geohash|waypoint)'
      -- Por tipo também, e não só por nome: uma coluna `caminho path` guarda
      -- exatamente o mesmo rastro e não casa com nenhum nome acima. Os quatro
      -- primeiros são nativos do Postgres e não precisam de extensão nenhuma
      -- para existir — foi o que a prova negativa desta guarda encontrou.
      OR udt_name IN ('geography', 'geometry', 'point', 'path', 'line', 'lseg', 'box', 'circle', 'polygon')
    );

  IF geograficas IS NOT NULL THEN
    RAISE EXCEPTION
      'RASTRO GRAVADO: coluna de geolocalização em public — %. A #278 decidiu persistir só o derivado (distância, ritmo); reverter isso é decisão de LGPD, não de schema',
      geograficas;
  END IF;

  RAISE NOTICE 'ok  nenhuma coluna de geolocalização em public';
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
    (student_id, started_at, completed_at, perceived_exertion, notes, session_type,
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
    (student_id, started_at, completed_at, perceived_exertion, notes, session_type)
  VALUES (aluno_a, now(), now(), 8, 'senti dor no ombro direito', 'strength')
  RETURNING id INTO sessao_a;

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);

  -- 1. O aluno corrige a própria declaração. É o direito do Art. 18, III.
  UPDATE public.workout_sessions
     SET notes = 'era o ombro esquerdo', perceived_exertion = 7, feedback_edited_at = now()
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

  -- As medidas da corrida (0049) entram na mesma proibição. Distância e ritmo
  -- são o que o especialista usa para prescrever a semana seguinte; editáveis
  -- pelo aluno, viram o número que ele gostaria de ter feito.
  BEGIN
    UPDATE public.workout_sessions SET distance_meters = 42195 WHERE id = sessao_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: UPDATE de distance_meters foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.workout_sessions SET avg_pace_seconds_per_km = 180 WHERE id = sessao_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: UPDATE de avg_pace_seconds_per_km foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.workout_sessions SET avg_cadence_spm = 190 WHERE id = sessao_a;
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: UPDATE de avg_cadence_spm foi aceito';
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
  RAISE NOTICE 'ok  correção: dono edita notes/perceived_exertion, ninguém edita medida, ninguém apaga sessão';
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

  INSERT INTO public.health_daily_metrics
    (student_id, date, steps, active_calories, sleep_minutes, resting_heart_rate)
  VALUES
    (aluno_a, current_date, 8421, 512, 431, 58),
    (aluno_b, current_date, 3110, 197, 388, 66);

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  -- Consentimento para os dois alunos: desde a 0043 a leitura do especialista
  -- depende dele, e sem semear aqui o teste passaria por falta de autorização
  -- em vez de por falta de vínculo — dois motivos diferentes, mesmo resultado.
  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES
    (aluno_a, 'health_data_collection', now(), '1.2'),
    (aluno_b, 'health_data_collection', now(), '1.2');

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

  -- As colunas da 0046 herdam a política, que é por linha. "Deveria herdar" e
  -- "herdou" não são a mesma afirmação — foi por isso que as colunas da 0035
  -- ganharam teste próprio. Fica aqui, com o vínculo ainda ativo: mais abaixo o
  -- teste desvincula, e a asserção passaria a medir a outra coisa.
  SELECT count(*) INTO visiveis
    FROM public.health_daily_metrics
   WHERE student_id = aluno_a AND sleep_minutes IS NOT NULL AND resting_heart_rate IS NOT NULL;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista não lê sono/FC de repouso do aluno A (viu %)', visiveis;
  END IF;

  -- Ler é tudo que o especialista pode. A métrica é medida do aparelho, e o
  -- remédio para medida inexata é medir de novo, não digitar outro número
  -- (Art. 6°, V) — mesma doutrina de `body_scans` na 0038.
  UPDATE public.health_daily_metrics SET steps = 99999 WHERE student_id = aluno_a;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: especialista alterou % dia(s) do aluno A', afetadas;
  END IF;

  -- Revogou, perde o acesso na mesma consulta (0043). O aluno tem dois caminhos
  -- de saída com escopos diferentes: revogar tira o dado de saúde do
  -- especialista, encerrar o vínculo tira tudo. Este é o primeiro.
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now()
   WHERE student_id = aluno_a AND consent_type = 'health_data_collection';
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO vazou
    FROM public.health_daily_metrics WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: aluno A revogou e o especialista ainda lê % dia(s)', vazou;
  END IF;

  -- E o próprio aluno continua vendo o que já foi coletado: revogar interrompe
  -- a coleta e o compartilhamento, não exerce o direito de eliminação
  -- (Art. 18, VI), que é caminho separado.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis
    FROM public.health_daily_metrics WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'revogar apagou o histórico do próprio aluno (viu %)', visiveis;
  END IF;

  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = NULL
   WHERE student_id = aluno_a AND consent_type = 'health_data_collection';

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
  RAISE NOTICE 'ok  métricas diárias: isoladas por vínculo e por consentimento, imutáveis, invisíveis ao admin';
END $$;

ROLLBACK;

-- ── FC média da sessão (0049) ────────────────────────────────────────────────
-- A tabela nasceu separada de `workout_sessions` justamente para poder ter esta
-- política: Art. 11 pede tutela da saúde MAIS consentimento, então revogar
-- fecha o acesso do especialista — o que a tabela de sessões não pode fazer,
-- porque revogar consentimento de saúde não pode desligar a prescrição de
-- treino.
--
-- As duas metades são semeadas: aluno A com consentimento, aluno B sem vínculo.
-- "Zero linhas" só significa bloqueio quando existe linha do outro lado para
-- ter vazado.

BEGIN;

DO $$
DECLARE
  aluno_a  uuid := gen_random_uuid();
  aluno_b  uuid := gen_random_uuid();
  espec    uuid := gen_random_uuid();
  sessao_a uuid;
  sessao_sem_fc uuid;
  visiveis int;
  vazou    int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-va@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-vb@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (espec,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ve@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  INSERT INTO public.workout_sessions
    (student_id, started_at, completed_at, session_type, duration_seconds,
     distance_meters, avg_pace_seconds_per_km, avg_cadence_spm)
  VALUES (aluno_a, now(), now(), 'cardio', 3604, 9620, 374, 179)
  RETURNING id INTO sessao_a;

  INSERT INTO public.workout_session_vitals (session_id, avg_heart_rate)
  VALUES (sessao_a, 164);

  -- Sessão do aluno A sem FC gravada: é o alvo do passo 7, onde só a RLS pode
  -- barrar o INSERT do aluno B.
  INSERT INTO public.workout_sessions
    (student_id, started_at, completed_at, session_type, duration_seconds)
  VALUES (aluno_a, now(), now(), 'cardio', 1800)
  RETURNING id INTO sessao_sem_fc;

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES (aluno_a, 'health_data_collection', now(), '1.4');

  SET LOCAL ROLE authenticated;

  -- 1. Com vínculo e consentimento, o especialista lê. É o caso de uso: sem
  --    ele, tudo abaixo passaria com uma tabela simplesmente vazia.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis
    FROM public.workout_session_vitals WHERE session_id = sessao_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista vinculado e consentido não lê a FC da sessão (viu %)', visiveis;
  END IF;

  -- 2. Revogou, perde. Caiu o consentimento, caiu a base do Art. 11.
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now()
   WHERE student_id = aluno_a AND consent_type = 'health_data_collection';
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO vazou
    FROM public.workout_session_vitals WHERE session_id = sessao_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: aluno revogou e o especialista ainda lê a FC (% linha(s))', vazou;
  END IF;

  -- 3. E o serviço contratado NÃO cai junto: a mesma revogação não pode tirar
  --    do especialista a distância e o ritmo, que são execução de contrato.
  --    É a metade que a guarda de classificação afirma em tabela, provada aqui
  --    em comportamento.
  SELECT count(*) INTO visiveis
    FROM public.workout_sessions WHERE id = sessao_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'SERVIÇO DESLIGADO POR REVOGAÇÃO: revogar saúde tirou a sessão de treino do especialista';
  END IF;

  -- 4. O próprio aluno continua vendo a FC que já foi medida. Revogar
  --    interrompe a coleta e o compartilhamento; eliminar é o Art. 18, VI, que
  --    é caminho separado.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis
    FROM public.workout_session_vitals WHERE session_id = sessao_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'revogar apagou a FC do próprio aluno (viu %)', visiveis;
  END IF;

  -- 5. Medida corrigida não é medida. Sem GRANT e sem política, nas duas
  --    camadas — a `0020` concede UPDATE e DELETE por default privileges a
  --    toda tabela nova, e sem o REVOKE da `0049` só a ausência de política
  --    estaria segurando.
  BEGIN
    UPDATE public.workout_session_vitals SET avg_heart_rate = 120
     WHERE session_id = sessao_a;
    RAISE EXCEPTION 'MEDIDA REESCRITA: UPDATE de avg_heart_rate foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.workout_session_vitals WHERE session_id = sessao_a;
    RAISE EXCEPTION 'MEDIDA APAGADA: DELETE em workout_session_vitals foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 6. Um aluno não lê o batimento do outro.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_b, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO vazou
    FROM public.workout_session_vitals WHERE session_id = sessao_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: aluno B lê a FC do aluno A (% linha(s))', vazou;
  END IF;

  -- 7. E não grava FC na sessão alheia: sinal vital registrado por terceiro não
  --    é medida, é invenção.
  --
  --    A tentativa vai numa sessão do aluno A que ainda NÃO tem linha de FC.
  --    Contra `sessao_a` o INSERT também falharia — por violar a chave primária
  --    — e o teste passaria sem a RLS ter opinado, que é como uma trava vira
  --    decoração.
  BEGIN
    INSERT INTO public.workout_session_vitals (session_id, avg_heart_rate)
    VALUES (sessao_sem_fc, 200);
    RAISE EXCEPTION 'FC FORJADA: aluno B gravou batimento na sessão do aluno A';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RESET ROLE;
  RAISE NOTICE 'ok  FC de sessão: revogação fecha o especialista sem derrubar o treino, imutável, isolada por aluno';
END $$;

ROLLBACK;

-- ── Revogação alcança as tabelas de Art. 11 (0044, 0045) ────────────────────
-- A `0043` fechou `health_daily_metrics`; a `0044` estendeu a regra a
-- `meal_logs` e `physical_assessments`, que a `LGPD_COMPLIANCE.md` §7 já citava
-- como tendo o mesmo comportamento sem tê-lo.
--
-- A semântica aqui é **outra de propósito**, e o teste existe para travá-la nos
-- dois sentidos. Estas tabelas usam `health_consent_not_revoked`, que só nega
-- diante de revogação explícita: elas têm acervo gravado por caminhos que nunca
-- checaram consentimento, e o helper estrito da `0043` esvaziaria o painel de
-- todo aluno sem registro. As duas metades são afirmadas abaixo — quem revogou
-- some, quem nunca registrou nada continua visível — porque trocar uma pela
-- outra sem querer é a falha provável deste desenho.

BEGIN;

DO $$
DECLARE
  aluno_a  uuid := gen_random_uuid();
  aluno_b  uuid := gen_random_uuid();
  espec    uuid := gen_random_uuid();
  visiveis int;
  vazou    int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ra@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-rb@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (espec,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-re@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  INSERT INTO public.physical_assessments (student_id, specialist_id, height_cm, weight_kg)
  VALUES (aluno_a, espec, 175, 80), (aluno_b, espec, 168, 62);

  INSERT INTO public.meal_logs (student_id, logged_date, completed)
  VALUES (aluno_a, current_date, true), (aluno_b, current_date, true);

  INSERT INTO public.student_anamnesis (student_id, responses)
  VALUES (aluno_a, '{"lesoes":"hérnia de disco"}'::jsonb),
         (aluno_b, '{"lesoes":"nenhuma"}'::jsonb);

  INSERT INTO public.body_scans (student_id)
  VALUES (aluno_a), (aluno_b);

  -- Execução de contrato, para provar que a revogação NÃO a alcança.
  INSERT INTO public.workout_sessions (student_id, started_at, completed_at, perceived_exertion)
  VALUES (aluno_a, now(), now(), 7);

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES
    (aluno_a, espec, 'personal_training', 'active'),
    (aluno_b, espec, 'personal_training', 'active');

  -- Só o aluno A registra consentimento. O B fica **sem linha nenhuma**, que é
  -- a situação de todo o acervo anterior ao portão de coleta.
  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES (aluno_a, 'health_data_collection', now(), '1.2');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO visiveis FROM public.physical_assessments WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista não lê a avaliação do aluno A, que consentiu (viu %)', visiveis;
  END IF;

  -- A metade que protege o produto: sem registro de consentimento o acervo
  -- continua visível. Se esta asserção falhar, a política trocou de helper e
  -- todo aluno anterior ao portão sumiu do painel do especialista.
  SELECT count(*) INTO visiveis FROM public.physical_assessments WHERE student_id = aluno_b;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'ACERVO SUMIU: aluno B, sem registro de consentimento, ficou invisível ao especialista';
  END IF;

  SELECT count(*) INTO visiveis FROM public.meal_logs WHERE student_id = aluno_b;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'ACERVO SUMIU: refeições do aluno B, sem registro de consentimento, ficaram invisíveis';
  END IF;

  -- A metade que cumpre o Art. 11: revogou, fecha.
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now()
   WHERE student_id = aluno_a AND consent_type = 'health_data_collection';
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO vazou FROM public.physical_assessments WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: aluno A revogou e o especialista ainda lê % avaliação(ões)', vazou;
  END IF;

  SELECT count(*) INTO vazou FROM public.meal_logs WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: aluno A revogou e o especialista ainda lê % refeição(ões)', vazou;
  END IF;

  SELECT count(*) INTO vazou FROM public.student_anamnesis WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: aluno A revogou e o especialista ainda lê % anamnese(s)', vazou;
  END IF;

  SELECT count(*) INTO vazou FROM public.body_scans WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: aluno A revogou e o especialista ainda lê % body scan(s)', vazou;
  END IF;

  -- O serviço contratado sobrevive à revogação: o treino prescrito e a sessão
  -- executada são Art. 7°, V, e o caminho para encerrá-los é encerrar o
  -- vínculo. Se esta asserção falhar, alguém somou consentimento a uma política
  -- de execução de contrato e desligou o produto para quem revogou.
  SELECT count(*) INTO visiveis FROM public.workout_sessions WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'SERVIÇO DESLIGADO: revogar tirou do especialista a sessão de treino do aluno A (viu %)', visiveis;
  END IF;

  -- E não coleta dado novo de quem revogou: escrita que ninguém consegue reler
  -- é pior que a recusa.
  BEGIN
    INSERT INTO public.physical_assessments (student_id, specialist_id, height_cm, weight_kg)
    VALUES (aluno_a, espec, 175, 81);
    RAISE EXCEPTION 'COLETA APÓS REVOGAÇÃO: INSERT de avaliação foi aceito para quem revogou';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- O próprio aluno segue vendo o que é dele. Revogar não é eliminar.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.physical_assessments WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'revogar apagou a avaliação do próprio aluno (viu %)', visiveis;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  revogação fecha as 5 tabelas de Art. 11, poupa a execução de contrato, e ausência de registro não esvazia o acervo';
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

-- ─────────────────────────────────────────────────────────────────────────────
-- A proposta só é aprovada uma vez — Art. 6º, V (qualidade) e VI (prevenção)
--
-- Aprovar duas vezes gravava duas vezes: as rotas liam a proposta pendente,
-- gravavam, e só então limpavam o pendente. Duas abas, ou um retry depois do
-- `maxDuration = 60` da Vercel, e a mesma prescrição entrava duplicada na conta
-- do aluno — dado incorreto sobre a saúde de alguém, que é o que o Art. 6º, V
-- proíbe, e prescrição repetida que ninguém pediu.
--
-- Duas coisas são verificadas, e vale saber qual é qual.
--
-- O comportamento — reivindicar duas vezes devolve a proposta só na primeira —
-- é testado de verdade, e é dele que dependem o segundo clique e o retry.
--
-- Já a corrida entre duas abas depende do `FOR UPDATE`, e isso um script de uma
-- sessão só não alcança: as duas chamadas aqui são sequenciais, e passariam
-- igual com um SELECT comum. Por isso o `FOR UPDATE` é conferido na definição
-- da função — guarda mais fraca que a de comportamento, e a que existe: uma
-- migration futura que o remova recriaria a janela sem mudar assinatura
-- nenhuma, e nada mais acusaria.
BEGIN;

DO $$
DECLARE
  aluno    uuid := gen_random_uuid();
  espec    uuid := gen_random_uuid();
  conversa uuid;
  primeira jsonb;
  segunda  jsonb;
  sobrou   jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-proposta-a@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (espec, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-proposta-e@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  INSERT INTO public.ai_chat_sessions (student_id, specialist_id, module, state)
  VALUES (aluno, espec, 'workout', jsonb_build_object(
    'savedWorkouts', '[]'::jsonb,
    'pendingWorkoutProposal', jsonb_build_object('phase_name', 'Adaptação'),
    'resolvedDietPlan', jsonb_build_object('name', 'Cutting 8')
  ))
  RETURNING id INTO conversa;

  primeira := public.reivindicar_proposta(conversa, 'pendingWorkoutProposal');
  segunda  := public.reivindicar_proposta(conversa, 'pendingWorkoutProposal');

  IF primeira IS NULL THEN
    RAISE EXCEPTION 'a primeira reivindicação voltou vazia — ninguém consegue aprovar';
  END IF;

  -- O que a duplicação custava: a segunda aprovação recebia a mesma proposta e
  -- gravava os mesmos treinos outra vez.
  IF segunda IS NOT NULL THEN
    RAISE EXCEPTION
      'PRESCRIÇÃO DUPLICADA: a segunda reivindicação devolveu a proposta de novo (%)', segunda;
  END IF;

  -- Reivindicar uma chave leva só ela. O resto do `state` é o registro do que
  -- já foi decidido, e perdê-lo apagaria a tela do especialista.
  SELECT state INTO sobrou FROM public.ai_chat_sessions WHERE id = conversa;
  IF sobrou -> 'resolvedDietPlan' IS NULL OR sobrou -> 'savedWorkouts' IS NULL THEN
    RAISE EXCEPTION 'a reivindicação levou junto o resto do state: %', sobrou;
  END IF;

  -- Chave que não existe não é erro, é "não há o que aprovar" — e não pode
  -- mexer no que está lá.
  IF public.reivindicar_proposta(conversa, 'pendingDietMeals') IS NOT NULL THEN
    RAISE EXCEPTION 'reivindicar chave ausente devolveu alguma coisa';
  END IF;

  -- A volta: falhou a gravação, a proposta retorna à fila de decisão.
  PERFORM public.devolver_proposta(conversa, 'pendingWorkoutProposal', primeira);
  SELECT state INTO sobrou FROM public.ai_chat_sessions WHERE id = conversa;
  IF sobrou -> 'pendingWorkoutProposal' IS NULL THEN
    RAISE EXCEPTION 'devolver_proposta não recolocou a proposta na fila: %', sobrou;
  END IF;

  -- O que o teste sequencial acima não alcança. Sem a trava de linha, duas abas
  -- leem a mesma proposta pendente e gravam os mesmos treinos na conta do aluno.
  IF (SELECT pg_get_functiondef(p.oid) FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'reivindicar_proposta') NOT LIKE '%FOR UPDATE%'
  THEN
    RAISE EXCEPTION
      'CORRIDA REABERTA: reivindicar_proposta perdeu o FOR UPDATE — duas abas voltam a gravar a mesma proposta';
  END IF;

  RAISE NOTICE 'ok  proposta: reivindicada uma vez só, com trava de linha, e devolvida quando a gravação falha';
END $$;

ROLLBACK;

-- ── A água do dia (0052) ─────────────────────────────────────────────────────
-- `hydration_daily` é registro alimentar, Art. 11, II, f + I (LGPD_COMPLIANCE.md
-- §2.2, issue #298). O parecer do /lgpd-check decidiu três restrições, e cada
-- uma é travada aqui por comportamento, com prova negativa feita no banco local:
--
--   1. só o próprio aluno lê e grava — nenhum outro aluno, nenhum especialista,
--      nem o vinculado: nenhuma tela dele consome o dado (Art. 6°, III);
--   2. gravar exige consentimento vigente, no banco, e não só no portão do app;
--   3. o total tem faixa de plausibilidade, e o dia não se apaga por DELETE.
--
-- Linhas semeadas para os DOIS alunos: "zero linhas" precisa significar
-- bloqueio, e não tabela vazia.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'hydration_daily' AND c.conname = 'hydration_daily_water_ml_plausible'
  ) THEN
    RAISE EXCEPTION 'ERRO DE UNIDADE SEM BARREIRA: CHECK de plausibilidade ausente em hydration_daily';
  END IF;

  IF has_table_privilege('anon', 'public.hydration_daily', 'SELECT') THEN
    RAISE EXCEPTION 'VAZAMENTO PELA CHAVE ANÔNIMA: anon tem SELECT em hydration_daily';
  END IF;

  IF has_table_privilege('authenticated', 'public.hydration_daily', 'DELETE') THEN
    RAISE EXCEPTION 'HISTÓRICO APAGÁVEL: authenticated tem DELETE em hydration_daily';
  END IF;

  RAISE NOTICE 'ok  água do dia: faixa de plausibilidade, sem anon e sem DELETE';
END $$;

BEGIN;

DO $$
DECLARE
  aluno_a    uuid := gen_random_uuid();
  aluno_b    uuid := gen_random_uuid();
  sem_aceite uuid := gen_random_uuid();
  espec      uuid := gen_random_uuid();
  visiveis   int;
  vazou      int;
  afetadas   int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno_a,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-wa@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-wb@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (sem_aceite, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-wc@elevapro.local', '{"full_name":"C","account_type":"student"}'::jsonb),
    (espec,      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-we@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES
    (aluno_a, 'health_data_collection', now(), '1.5'),
    (aluno_b, 'health_data_collection', now(), '1.5');

  -- Vínculo ativo E consentimento: o especialista tem tudo que as outras
  -- tabelas de saúde pedem. Se ainda assim ele não lê, é porque a tabela não
  -- tem política para ele — que é a decisão, e não um acaso do teste.
  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  INSERT INTO public.hydration_daily (student_id, date, water_ml)
  VALUES (aluno_b, current_date, 1500);

  SET LOCAL ROLE authenticated;

  -- O aluno com consentimento grava e corrige o próprio dia.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  INSERT INTO public.hydration_daily (student_id, date, water_ml) VALUES (aluno_a, current_date, 750);
  UPDATE public.hydration_daily SET water_ml = 1000 WHERE student_id = aluno_a;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 1 THEN
    RAISE EXCEPTION 'o aluno não corrige a própria água (Art. 18, III): % linha(s)', afetadas;
  END IF;

  SELECT count(*) INTO vazou FROM public.hydration_daily WHERE student_id = aluno_b;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: aluno A lê % dia(s) de água do aluno B', vazou;
  END IF;

  -- Gravar em nome de outro aluno é recusado pela política, e não só escondido.
  BEGIN
    INSERT INTO public.hydration_daily (student_id, date, water_ml)
    VALUES (aluno_b, current_date - 1, 500);
    RAISE EXCEPTION 'REGISTRO ALHEIO: aluno A gravou água no nome do aluno B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Apagar o dia não existe: a correção é outro total, a eliminação é da conta.
  BEGIN
    DELETE FROM public.hydration_daily WHERE student_id = aluno_a;
    RAISE EXCEPTION 'HISTÓRICO APAGADO: DELETE em hydration_daily foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Sem consentimento, o banco recusa a coleta. O portão do app é a primeira
  -- barreira; esta é a que vale quando o app tem um caminho que ninguém lembrou.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', sem_aceite, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.hydration_daily (student_id, date, water_ml)
    VALUES (sem_aceite, current_date, 250);
    RAISE EXCEPTION 'COLETA SEM CONSENTIMENTO: dado de saúde gravado por quem não autorizou (Art. 11, I)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- O especialista vinculado e com consentimento não lê: nenhuma tela dele usa
  -- o dado, e abrir a leitura "para depois" é o que o Art. 6°, III recusa.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO vazou FROM public.hydration_daily;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'LEITURA SEM FINALIDADE: especialista lê % dia(s) de água', vazou;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno_a, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.hydration_daily WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'o aluno não lê a própria água (viu %)', visiveis;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  água do dia: só o próprio aluno, com consentimento, sem especialista e sem DELETE';
END $$;

ROLLBACK;
