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


-- ── Estrutura ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  sem_rls text[];
  sem_politica text[];
  sem_mfa text[];
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

  SELECT array_agg(t.tablename ORDER BY t.tablename) INTO sem_mfa
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.rowsecurity
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = t.tablename
        AND p.policyname = 'privileged_session_requires_mfa'
        AND p.permissive = 'RESTRICTIVE'
    );

  IF sem_mfa IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelas sem trava MFA para conta privilegiada: %', array_to_string(sem_mfa, ', ');
  END IF;

  RAISE NOTICE 'ok  todas as tabelas de public têm RLS, política e trava MFA';
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

  IF NOT has_function_privilege(
    'authenticated', 'private.current_session_meets_mfa_requirement()', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated não pode executar private.current_session_meets_mfa_requirement';
  END IF;

  IF has_function_privilege('anon', 'public.link_student_by_code(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon pode executar link_student_by_code';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'assessments' AND NOT public) THEN
    RAISE EXCEPTION 'bucket assessments ausente ou público';
  END IF;

  RAISE NOTICE 'ok  helpers com EXECUTE correto e bucket assessments privado';
END $$;

-- O limitador guarda somente HMACs de origem e vive fora do schema exposto.
-- Esta prova afirma as duas portas: cliente não lê a tabela e tampouco chama a
-- função SECURITY DEFINER que a altera. O BFF usa service_role para a RPC.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'private' AND tablename = 'rate_limit_buckets' AND rowsecurity
  ) THEN
    RAISE EXCEPTION 'private.rate_limit_buckets ausente ou sem RLS';
  END IF;

  IF has_schema_privilege('anon', 'private', 'USAGE')
    OR has_schema_privilege('authenticated', 'private', 'USAGE')
    OR has_table_privilege('anon', 'private.rate_limit_buckets', 'SELECT')
    OR has_table_privilege('authenticated', 'private.rate_limit_buckets', 'SELECT') THEN
    RAISE EXCEPTION 'cliente tem acesso ao armazenamento privado do limitador';
  END IF;

  IF has_function_privilege(
    'anon', 'public.consume_rate_limit(text, text, integer, integer, integer)', 'EXECUTE'
  ) OR has_function_privilege(
    'authenticated', 'public.consume_rate_limit(text, text, integer, integer, integer)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'cliente pode executar public.consume_rate_limit';
  END IF;

  IF NOT has_function_privilege(
    'service_role', 'public.consume_rate_limit(text, text, integer, integer, integer)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role não pode executar public.consume_rate_limit';
  END IF;

  RAISE NOTICE 'ok  limitador privado: RLS, schema e EXECUTE fechados ao cliente';
END $$;

-- A trilha não pode ser alterada pelo cliente nem pelo BFF: service_role ganha
-- somente EXECUTE na função com assinatura mínima, nunca DML direto na tabela.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'private' AND tablename = 'security_audit_events' AND rowsecurity
  ) THEN
    RAISE EXCEPTION 'private.security_audit_events ausente ou sem RLS';
  END IF;

  IF has_table_privilege('anon', 'private.security_audit_events', 'SELECT')
    OR has_table_privilege('authenticated', 'private.security_audit_events', 'SELECT')
    OR has_table_privilege('service_role', 'private.security_audit_events', 'INSERT')
    OR has_table_privilege('service_role', 'private.security_audit_events', 'UPDATE')
    OR has_table_privilege('service_role', 'private.security_audit_events', 'DELETE') THEN
    RAISE EXCEPTION 'trilha de auditoria tem leitura de cliente ou escrita direta pelo BFF';
  END IF;

  IF has_function_privilege(
    'anon', 'public.record_security_audit_event(text, text, text, text, uuid, uuid, text, text)', 'EXECUTE'
  ) OR has_function_privilege(
    'authenticated', 'public.record_security_audit_event(text, text, text, text, uuid, uuid, text, text)', 'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role', 'public.record_security_audit_event(text, text, text, text, uuid, uuid, text, text)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'EXECUTE de record_security_audit_event não está restrito a service_role';
  END IF;

  RAISE NOTICE 'ok  trilha append-only: cliente sem leitura, BFF sem DML e RPC restrita';
END $$;

-- O bucket deve contar requisições no banco, não apenas ter grants corretos.
-- Uma janela curta mantém a verificação reexecutável sem deixar linhas de teste.
BEGIN;
DO $$
DECLARE
  bucket text := 'verify-rls-' || replace(gen_random_uuid()::text, '-', '');
  subject_hash text := repeat('a', 64);
  first_decision record;
  second_decision record;
  blocked_decision record;
  renewed_decision record;
BEGIN
  PERFORM pg_sleep(1.05 - mod(extract(epoch FROM clock_timestamp())::numeric, 1));
  SET LOCAL ROLE service_role;
  SELECT * INTO first_decision FROM public.consume_rate_limit(bucket, subject_hash, 2, 1, 2);
  SELECT * INTO second_decision FROM public.consume_rate_limit(bucket, subject_hash, 2, 1, 2);
  SELECT * INTO blocked_decision FROM public.consume_rate_limit(bucket, subject_hash, 2, 1, 2);

  IF first_decision.allowed IS DISTINCT FROM true OR first_decision.remaining <> 1
    OR second_decision.allowed IS DISTINCT FROM true OR second_decision.remaining <> 0
    OR blocked_decision.allowed IS DISTINCT FROM false OR blocked_decision.remaining <> 0 THEN
    RAISE EXCEPTION 'LIMITE FALHOU: bucket não recusou a terceira chamada após teto 2';
  END IF;

  PERFORM pg_sleep(1.1);
  SELECT * INTO renewed_decision FROM public.consume_rate_limit(bucket, subject_hash, 2, 1, 2);
  IF renewed_decision.allowed IS DISTINCT FROM true OR renewed_decision.remaining <> 1 THEN
    RAISE EXCEPTION 'JANELA NÃO RENOVOU: bucket continuou bloqueado após uma janela nova';
  END IF;
  RESET ROLE;
  RAISE NOTICE 'ok  rate limit: teto, bloqueio e janela nova';
END $$;
ROLLBACK;

-- O pseudônimo da trilha só protege se exigir a chave: SHA-256 puro de um UUID
-- se desfaz com o UUID que aparece em qualquer URL. E um UUID em claro no
-- resource_id, ao lado do pseudônimo do mesmo titular, desfaz o pseudônimo.
-- LGPD, arts. 12 e 13, § 4º: dado pseudonimizado só se reassocia com informação
-- adicional mantida em separado — aqui, a chave no Vault.
BEGIN;

DO $$
DECLARE
  conta uuid := gen_random_uuid();
  evento bigint;
  linha private.security_audit_events%ROWTYPE;
  uuid_recusado boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'audit_pseudonym_key') THEN
    RAISE EXCEPTION 'TRILHA PARADA: audit_pseudonym_key ausente do Vault; todo evento auditado vai falhar';
  END IF;

  IF private.audit_principal_hash(conta) = encode(extensions.digest(conta::text, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'PSEUDÔNIMO REVERSÍVEL: o hash do principal não usa chave; quem tem o UUID liga o evento à pessoa';
  END IF;

  SET LOCAL ROLE service_role;
  evento := public.record_security_audit_event(
    p_event_type => 'identity.registration.succeeded', p_outcome => 'succeeded',
    p_resource_type => 'account', p_origin => 'bff', p_actor_id => conta, p_subject_id => conta
  );
  BEGIN
    PERFORM public.record_security_audit_event(
      p_event_type => 'health.assessment.read', p_outcome => 'succeeded',
      p_resource_type => 'physical_assessment_collection', p_origin => 'bff',
      p_resource_id => 'student:' || conta::text
    );
  EXCEPTION WHEN raise_exception THEN
    uuid_recusado := true;
  END;
  RESET ROLE;

  IF NOT uuid_recusado THEN
    RAISE EXCEPTION 'UUID EM CLARO: a RPC aceitou UUID dentro do resource_id';
  END IF;

  SELECT * INTO linha FROM private.security_audit_events WHERE event_id = evento;
  IF linha.resource_id IS DISTINCT FROM private.audit_principal_hash(conta)
    OR linha.subject_hash IS DISTINCT FROM private.audit_principal_hash(conta) THEN
    RAISE EXCEPTION 'UUID EM CLARO: evento de conta não gravou o pseudônimo como titular e recurso';
  END IF;

  IF EXISTS (
    SELECT 1 FROM private.security_audit_events
    WHERE resource_id ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  ) THEN
    RAISE EXCEPTION 'UUID EM CLARO: há evento na trilha com UUID de pessoa no resource_id';
  END IF;

  RAISE NOTICE 'ok  pseudônimo com chave do Vault e nenhum UUID de pessoa em resource_id';
END $$;

ROLLBACK;

-- Aceite de convite é a troca real de senha no Auth, não uma requisição que
-- qualquer cliente autenticado pode enviar ao BFF. LGPD, arts. 6º, X e 46.
BEGIN;
DO $$
DECLARE
  account_id uuid := gen_random_uuid();
  accepted_count integer;
  current_status public.account_status;
  rejection_message text;
  attempted_origin text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'auth_user_invite_password_activation'
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'ACEITE SEM PROVA: trigger de senha do convite ausente ou desabilitado';
  END IF;
  IF has_function_privilege('anon', 'private.audit_invite_password_activation()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'private.audit_invite_password_activation()', 'EXECUTE')
    OR has_function_privilege('service_role', 'private.audit_invite_password_activation()', 'EXECUTE') THEN
    RAISE EXCEPTION 'ACEITE FORJÁVEL: função do trigger está executável fora do Auth';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'private.security_audit_events'::regclass
      AND tgname = 'security_audit_reject_unproven_invite_acceptance'
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'ACEITE FORJÁVEL: trilha aceita origem não provada';
  END IF;

  SET LOCAL ROLE service_role;
  FOREACH attempted_origin IN ARRAY ARRAY['bff', 'database'] LOOP
    rejection_message := NULL;
    BEGIN
      PERFORM public.record_security_audit_event(
        p_event_type => 'identity.invite.accepted', p_outcome => 'succeeded',
        p_resource_type => 'account', p_origin => attempted_origin, p_actor_id => account_id,
        p_subject_id => account_id
      );
    EXCEPTION WHEN raise_exception THEN
      GET STACKED DIAGNOSTICS rejection_message = MESSAGE_TEXT;
    END;
    IF rejection_message NOT LIKE 'invite acceptance requires Auth password change%' THEN
      RAISE EXCEPTION 'ACEITE FORJÁVEL: BFF com origem % não foi recusado pelo trigger: %',
        attempted_origin, rejection_message;
    END IF;
  END LOOP;
  RESET ROLE;

  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES (
    account_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'verify-invite-' || account_id::text || '@elevapro.local',
    '{"full_name":"Convite","account_type":"student"}'::jsonb
  );
  UPDATE public.profiles SET account_status = 'invited' WHERE id = account_id;

  SELECT count(*) INTO accepted_count FROM private.security_audit_events
   WHERE event_type = 'identity.invite.accepted'
     AND subject_hash = private.audit_principal_hash(account_id);
  IF accepted_count <> 0 THEN
    RAISE EXCEPTION 'ACEITE FALSO: convite gerou evento antes da senha';
  END IF;

  UPDATE auth.users SET encrypted_password = 'verify-new-password-hash'
   WHERE id = account_id;
  SELECT account_status INTO current_status FROM public.profiles WHERE id = account_id;
  SELECT count(*) INTO accepted_count FROM private.security_audit_events
   WHERE event_type = 'identity.invite.accepted'
     AND actor_hash = private.audit_principal_hash(account_id)
     AND subject_hash = private.audit_principal_hash(account_id)
     AND resource_id = private.audit_principal_hash(account_id)
     AND origin = 'database';
  IF current_status <> 'active' OR accepted_count <> 1 THEN
    RAISE EXCEPTION 'ACEITE NÃO PROVADO: mudança de senha não ativou convite e evento mínimo';
  END IF;

  UPDATE auth.users SET encrypted_password = 'verify-second-password-hash'
   WHERE id = account_id;
  SELECT count(*) INTO accepted_count FROM private.security_audit_events
   WHERE event_type = 'identity.invite.accepted'
     AND subject_hash = private.audit_principal_hash(account_id);
  IF accepted_count <> 1 THEN
    RAISE EXCEPTION 'ACEITE DUPLICADO: troca posterior de senha gerou outro aceite';
  END IF;
  RAISE NOTICE 'ok  convite aceito só após senha no Auth, sem evento duplicado';
END $$;
ROLLBACK;

-- Papel e status determinam acesso. A prova exige que a trilha não seja uma
-- convenção do painel administrativo: a RPC de onboarding também a atravessa,
-- enquanto UPDATE direto da coluna continua negado ao usuário comum.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'profiles_audit_authorization_change'
      AND tgrelid = 'public.profiles'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'profiles não possui trigger de auditoria de autorização';
  END IF;

  IF has_function_privilege('anon', 'private.audit_profile_authorization_change()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'private.audit_profile_authorization_change()', 'EXECUTE')
    OR has_function_privilege('service_role', 'private.audit_profile_authorization_change()', 'EXECUTE') THEN
    RAISE EXCEPTION 'papel da aplicação pode chamar a função de auditoria de conta';
  END IF;

  RAISE NOTICE 'ok  mudanças de papel e status geram evento privado no banco';
END $$;

-- Trigger e event trigger não são RPCs. A execução direta por anon virava uma
-- superfície PostgREST que não existe no produto; a única exceção é o
-- onboarding autenticado, que precisa da porta estreita set_own_account_type.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
    -- Entre parênteses: sem eles, o IF do PL/pgSQL termina no THEN do CASE.
    OR (CASE
      WHEN to_regprocedure('public.rls_auto_enable()') IS NULL THEN false
      ELSE has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE')
        OR has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE')
    END)
    OR has_function_privilege('anon', 'public.set_own_account_type(public.account_type, text)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.set_own_account_type(public.account_type, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'SUPERFÍCIE RPC INDEVIDA: trigger/event trigger ou onboarding tem EXECUTE divergente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('foods_search_vector_update', 'update_ai_chat_session_timestamp')
      AND COALESCE(array_to_string(p.proconfig, ','), '') !~ 'search_path=pg_catalog'
  ) THEN
    RAISE EXCEPTION 'SEARCH PATH MUTÁVEL: função de trigger sem caminho fixo';
  END IF;

  RAISE NOTICE 'ok  funções internas sem RPC pública e triggers com search_path fixo';
END $$;

-- Vínculo é a fronteira de autorização do Specialist. O evento precisa nascer
-- com a alteração, pois app, RPC e BFF gravam por caminhos distintos. Só IDs
-- opacos entram na evidência: o vínculo não é licença para duplicar o dado que
-- ele protege.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'student_specialists_audit_change'
      AND tgrelid = 'public.student_specialists'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'student_specialists não possui trigger de auditoria';
  END IF;

  IF has_function_privilege('anon', 'private.audit_student_specialist_link_change()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'private.audit_student_specialist_link_change()', 'EXECUTE')
    OR has_function_privilege('service_role', 'private.audit_student_specialist_link_change()', 'EXECUTE') THEN
    RAISE EXCEPTION 'papel da aplicação pode chamar a função de auditoria de vínculo';
  END IF;

  RAISE NOTICE 'ok  vínculo gera evento no banco sem expor dados do aluno';
END $$;

-- Consentimento é escrito pelo cliente sob RLS. Sem trigger, a evidência seria
-- uma segunda chamada opcional e justamente a revogação poderia desaparecer da
-- investigação. A função registra só tipo+versão, nunca resposta de saúde.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'student_consents_audit_change' AND tgrelid = 'public.student_consents'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'student_consents não possui trigger de auditoria';
  END IF;

  IF has_function_privilege('anon', 'private.audit_student_consent_change()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'private.audit_student_consent_change()', 'EXECUTE')
    OR has_function_privilege('service_role', 'private.audit_student_consent_change()', 'EXECUTE') THEN
    RAISE EXCEPTION 'papel da aplicação pode chamar a função de auditoria de consentimento';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'private' AND table_name = 'security_audit_events'
      AND column_name IN ('body', 'content', 'payload', 'responses')
  ) THEN
    RAISE EXCEPTION 'TRILHA SENSÍVEL: auditoria ganhou coluna de conteúdo de consentimento';
  END IF;

  RAISE NOTICE 'ok  consentimento gera evento no banco sem guardar conteúdo sensível';
END $$;

-- Retenção não pode depender de uma próxima ação do usuário. `pg_cron` executa
-- a limpeza diariamente, e a função privada não pode virar uma ferramenta de
-- DELETE para o cliente ou o BFF.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'purge-security-audit-events'
      AND schedule = '17 3 * * *'
      AND command = 'SELECT private.purge_expired_security_audit_events()'
  ) THEN
    RAISE EXCEPTION 'job diário de retenção da trilha de auditoria está ausente ou divergente';
  END IF;

  IF has_function_privilege('anon', 'private.purge_expired_security_audit_events()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'private.purge_expired_security_audit_events()', 'EXECUTE')
    OR has_function_privilege('service_role', 'private.purge_expired_security_audit_events()', 'EXECUTE') THEN
    RAISE EXCEPTION 'papel da aplicação pode disparar a remoção da trilha de auditoria';
  END IF;

  RAISE NOTICE 'ok  retenção diária da trilha agendada e função de remoção privada';
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
      AND NOT (policyname = 'privileged_session_requires_mfa' AND permissive = 'RESTRICTIVE')
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
  adm      uuid := gen_random_uuid();
  adm_sem_fator uuid := gen_random_uuid();
  visiveis int;
  eventos_auditados int;
  vinculo_id uuid;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-a@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (aluno_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-b@elevapro.local', '{"full_name":"B","account_type":"student"}'::jsonb),
    (espec,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-e@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb),
    (adm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-g@elevapro.local', '{"full_name":"G","account_type":"specialist"}'::jsonb),
    (adm_sem_fator, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-h@elevapro.local', '{"full_name":"H","account_type":"specialist"}'::jsonb);

  -- Art. 46: conta Auth sem perfil não chega ao MFA nem ao CASL. O trigger é
  -- a fronteira que cria identidade de domínio, então esta prova usa o banco real.
  SELECT count(*) INTO visiveis
  FROM public.profiles
  WHERE id IN (aluno_a, aluno_b, espec, adm, adm_sem_fator);
  IF visiveis <> 5 THEN
    RAISE EXCEPTION 'CADASTRO INCOMPLETO: trigger criou % perfis para 5 contas Auth', visiveis;
  END IF;

  -- O trigger da 0040 não cria admin pelo signup; a promoção é explícita.
  UPDATE public.profiles SET account_type = 'admin' WHERE id IN (adm, adm_sem_fator);

  -- Dado de saúde para os DOIS alunos: assim "zero linhas" significa bloqueio e
  -- não tabela vazia.
  INSERT INTO public.student_anamnesis (student_id, responses, completed_at)
  VALUES (aluno_a, '{"verificacao":true}'::jsonb, now()),
         (aluno_b, '{"verificacao":true}'::jsonb, now());

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active')
  RETURNING id INTO vinculo_id;

  INSERT INTO public.specialist_services (specialist_id, service_type)
  VALUES (espec, 'nutrition_consulting');

  -- Uma Passkey de admin só vale se a conta também tiver TOTP verificado.
  INSERT INTO auth.mfa_factors
    (id, user_id, factor_type, status, created_at, updated_at)
  VALUES (gen_random_uuid(), adm, 'totp', 'verified', now(), now());

  -- A criação do vínculo que libera acesso produz uma única evidência, com
  -- especialista como ator no caminho interno de provisionamento.
  SELECT count(*) INTO eventos_auditados
    FROM private.security_audit_events
   WHERE event_type = 'authorization.specialist_student_link.granted'
     AND outcome = 'succeeded'
     AND actor_hash = private.audit_principal_hash(espec)
     AND subject_hash = private.audit_principal_hash(aluno_a)
     AND resource_type = 'specialist_student_link'
     AND resource_id = private.audit_principal_hash(vinculo_id);
  IF eventos_auditados <> 1 THEN
    RAISE EXCEPTION 'AUDITORIA AUSENTE: criação do vínculo gerou % eventos, esperado 1', eventos_auditados;
  END IF;

  -- A partir daqui a sessão é um usuário comum, não o dono do banco.
  SET LOCAL ROLE authenticated;

  -- ADR-0047: o especialista entra por senha, sem segundo fator. O que limita
  -- o alcance dele é o vínculo ativo: lê o aluno vinculado e não o outro.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal1',
      'amr', json_build_array(json_build_object('method', 'password')))::text, true);
  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'ESPECIALISTA BARRADO: login por senha viu % anamnese(s) do aluno vinculado', visiveis;
  END IF;
  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_b;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: especialista por senha leu % anamnese(s) de aluno sem vínculo', visiveis;
  END IF;

  -- Art. 46: o admin alcança todas as contas, e senha sozinha não basta. A
  -- trava é a função que toda política restritiva chama; `authenticated` não
  -- tem USAGE em `private`, então ela é conferida com o papel resetado, sobre
  -- as mesmas claims.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1',
      'amr', json_build_array(json_build_object('method', 'password')))::text, true);
  SELECT count(*) INTO visiveis FROM public.profiles WHERE id = adm;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'PORTA MFA FECHADA: admin AAL1 não leu a própria identidade';
  END IF;

  RESET ROLE;
  IF private.current_session_meets_mfa_requirement() THEN
    RAISE EXCEPTION 'ADMIN SEM SEGUNDO FATOR: login por senha passou na trava MFA';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', adm_sem_fator, 'role', 'authenticated', 'aal', 'aal1',
      'amr', json_build_array(json_build_object('method', 'passkey')))::text, true);
  IF private.current_session_meets_mfa_requirement() THEN
    RAISE EXCEPTION 'PASSKEY SEM TOTP: admin sem fator verificado passou na trava MFA';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1',
      'amr', json_build_array(json_build_object('method', 'passkey')))::text, true);
  IF NOT private.current_session_meets_mfa_requirement() THEN
    RAISE EXCEPTION 'PASSKEY BLOQUEADA: admin com Passkey e TOTP foi barrado';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', adm_sem_fator, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  IF NOT private.current_session_meets_mfa_requirement() THEN
    RAISE EXCEPTION 'ADMIN BLOQUEADO: sessão aal2 foi barrada';
  END IF;
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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_a;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista vinculado não lê o aluno A (viu %)', visiveis;
  END IF;

  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_b;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'VAZAMENTO: especialista lê % anamnese(s) do aluno B, sem vínculo', visiveis;
  END IF;

  -- Art. 6º, VII: encerrar o vínculo remove o acesso e registra quem fez isso.
  -- A prova junta a consequência de autorização e a evidência que permite
  -- investigá-la; uma sem a outra não torna o controle auditável.
  RESET ROLE;
  UPDATE public.student_specialists
     SET status = 'inactive', ended_by = espec, ended_at = now()
   WHERE id = vinculo_id;

  SELECT count(*) INTO eventos_auditados
    FROM private.security_audit_events
   WHERE event_type = 'authorization.specialist_student_link.revoked'
     AND outcome = 'succeeded'
     AND actor_hash = private.audit_principal_hash(espec)
     AND subject_hash = private.audit_principal_hash(aluno_a)
     AND resource_type = 'specialist_student_link'
     AND resource_id = private.audit_principal_hash(vinculo_id);
  IF eventos_auditados <> 1 THEN
    RAISE EXCEPTION 'AUDITORIA AUSENTE: encerramento do vínculo gerou % eventos, esperado 1', eventos_auditados;
  END IF;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visiveis FROM public.student_anamnesis WHERE student_id = aluno_a;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'VÍNCULO ENCERRADO, ACESSO ATIVO: especialista lê % anamnese(s) após revogação', visiveis;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  isolamento por vínculo, escalonamento recusado e eventos de concessão/revogação';
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
                    'health_daily_metrics_resting_hr_plausible',
                    'health_daily_metrics_readiness_with_version',
                    'health_daily_metrics_readiness_score_range',
                    'health_daily_metrics_readiness_version_positive']) AS esperado
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'health_daily_metrics' AND c.conname = esperado
  );

  IF ausentes IS NOT NULL THEN
    RAISE EXCEPTION 'ERRO DE UNIDADE SEM BARREIRA: CHECK ausente em health_daily_metrics: %',
      array_to_string(ausentes, ', ');
  END IF;

  RAISE NOTICE 'ok  sono, FC de repouso e prontidão com faixa no banco, e a nota sempre com a versão';
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
                              'hydration_daily','specialist_notes',
                              'diet_plans','diet_meals','diet_meal_items',
                              'weekly_check_ins','plan_adjustments'];
  contrato    text[] := ARRAY['profiles','specialist_services','workout_sessions',
                              'workout_session_sets','workout_session_exercises',
                              'achievements','daily_goals','student_streaks',
                              'ranking_scores'];
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

  RAISE NOTICE 'ok  Art. 11 confere consentimento em 13 tabelas; Art. 7° não confere em 9';
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

-- ── FC só em tabela de saúde, e só o derivado (issue #304) ──────────────────
--
-- LGPD, Art. 11. FC média, FC de repouso e tempo por zona são dado de saúde e só
-- podem morar nas tabelas cuja RLS consulta consentimento. Uma coluna de FC em
-- `workout_sessions` ficaria sob a política da execução de contrato, que o
-- especialista continua lendo depois de o aluno revogar — a pendência de `notes`
-- pela terceira vez. Varre o schema inteiro para alcançar a tabela que ainda não
-- existe.
--
-- E dentro de `workout_session_vitals`, só colunas escalares: uma lista ou um JSON
-- ali é a série de batimentos que a 0049 vetou, com outro nome.

DO $$
DECLARE
  health_tables text[] := ARRAY['health_daily_metrics','workout_session_vitals'];
  misplaced     text;
  series        text;
BEGIN
  SELECT string_agg(format('%s.%s', table_name, column_name), ', ' ORDER BY table_name)
    INTO misplaced
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name ~* '(heart|bpm|^zone_[0-9])'
    AND table_name <> ALL (health_tables);

  IF misplaced IS NOT NULL THEN
    RAISE EXCEPTION
      'FC FORA DA TABELA DE SAÚDE: % está numa tabela cuja RLS não consulta consentimento. FC e zonas moram em workout_session_vitals (0049, 0054)',
      misplaced;
  END IF;

  -- A prontidão (0055) é dado de saúde derivado pelo mesmo critério: uma cópia da
  -- nota em `profiles` ou num resumo de treino ficaria sob a política da execução
  -- de contrato, e o especialista seguiria lendo depois da revogação.
  SELECT string_agg(format('%s.%s', table_name, column_name), ', ' ORDER BY table_name)
    INTO misplaced
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name ~* 'readiness'
    AND table_name <> 'health_daily_metrics';

  IF misplaced IS NOT NULL THEN
    RAISE EXCEPTION
      'PRONTIDÃO FORA DA TABELA DE SAÚDE: % está numa tabela cuja RLS não consulta consentimento. A nota mora em health_daily_metrics (0055)',
      misplaced;
  END IF;

  SELECT string_agg(column_name, ', ' ORDER BY column_name)
    INTO series
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'workout_session_vitals'
    AND data_type IN ('ARRAY', 'json', 'jsonb');

  IF series IS NOT NULL THEN
    RAISE EXCEPTION
      'SÉRIE DE BATIMENTOS GRAVADA: workout_session_vitals ganhou coluna de lista ou JSON (%). Só a média e os percentuais por zona podem ser guardados (0049)',
      series;
  END IF;

  RAISE NOTICE 'ok  FC, zonas e prontidão só em tabela de saúde, e só o derivado';
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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);

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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
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
  eventos_auditados int;
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
    (student_id, date, steps, active_calories, sleep_minutes, resting_heart_rate,
     readiness_score, readiness_version)
  VALUES
    (aluno_a, current_date, 8421, 512, 431, 58, 82, 1),
    (aluno_b, current_date, 3110, 197, 388, 66, 61, 1);

  -- LGPD, Art. 11 e ADR-0029. A nota sem a versão da regra é número sem régua:
  -- 70 de uma regra e 70 de outra não dizem a mesma coisa, e o especialista
  -- compararia as duas. O banco recusa uma sem a outra.
  BEGIN
    INSERT INTO public.health_daily_metrics
      (student_id, date, steps, active_calories, readiness_score)
    VALUES (aluno_b, current_date - 1, 0, 0, 70);
    RAISE EXCEPTION 'NOTA SEM RÉGUA: health_daily_metrics aceitou readiness_score sem readiness_version';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno_a, espec, 'personal_training', 'active');

  -- Consentimento para os dois alunos: desde a 0043 a leitura do especialista
  -- depende dele, e sem semear aqui o teste passaria por falta de autorização
  -- em vez de por falta de vínculo — dois motivos diferentes, mesmo resultado.
  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES
    (aluno_a, 'health_data_collection', now(), '1.2'),
    (aluno_b, 'health_data_collection', now(), '1.2');

  -- A concessão deixa prova no mesmo commit, sem repetir a resposta que a
  -- finalidade autorizou tratar. Duas linhas, dois eventos: se o trigger virar
  -- uma chamada opcional, a contagem denuncia a lacuna.
  SELECT count(*) INTO eventos_auditados
    FROM private.security_audit_events
   WHERE event_type = 'privacy.consent.granted'
     AND outcome = 'succeeded'
     AND subject_hash IN (private.audit_principal_hash(aluno_a), private.audit_principal_hash(aluno_b))
     AND resource_type = 'consent'
     AND resource_id = 'health_data_collection:1.2';
  IF eventos_auditados <> 2 THEN
    RAISE EXCEPTION 'AUDITORIA AUSENTE: concessões de consentimento geraram % eventos, esperados 2', eventos_auditados;
  END IF;

  SET LOCAL ROLE authenticated;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
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

  SELECT count(*) INTO visiveis
    FROM public.health_daily_metrics
   WHERE student_id = aluno_a AND readiness_score IS NOT NULL;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'especialista não lê a prontidão do aluno A (viu %)', visiveis;
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
  SELECT count(*) INTO eventos_auditados
    FROM private.security_audit_events
   WHERE event_type = 'privacy.consent.revoked'
     AND outcome = 'succeeded'
     AND subject_hash = private.audit_principal_hash(aluno_a)
     AND resource_type = 'consent'
     AND resource_id = 'health_data_collection:1.2';
  IF eventos_auditados <> 1 THEN
    RAISE EXCEPTION 'AUDITORIA AUSENTE: revogação de consentimento gerou % eventos, esperado 1', eventos_auditados;
  END IF;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO vazou
    FROM public.health_daily_metrics WHERE student_id = aluno_a;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: aluno A revogou e o especialista ainda lê % dia(s)', vazou;
  END IF;

  -- A nota (0055) sai pela mesma porta: afirmado sobre a coluna, e não só sobre
  -- a linha, para uma política futura por coluna não abrir a prontidão sozinha.
  SELECT count(*) INTO vazou
    FROM public.health_daily_metrics
   WHERE student_id = aluno_a AND readiness_score IS NOT NULL;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'PRONTIDÃO SEM CONSENTIMENTO: aluno A revogou e o especialista ainda lê a nota de % dia(s)', vazou;
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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
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

-- ── Papel e status de conta deixam evidência, sem promoção direta ───────────
--
-- A transição legítima do onboarding passa pela RPC, que tira o ator de
-- auth.uid(). A alteração manual da coluna pelo mesmo usuário é a escalada que
-- a migration 0040 fechou; ela segue recusada aqui como prova negativa.

BEGIN;

DO $$
DECLARE
  conta uuid := gen_random_uuid();
  eventos_auditados int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES (
    conta, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'verify-account-audit@elevapro.local', '{"full_name":"A","account_type":"member"}'::jsonb
  );

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', conta, 'role', 'authenticated')::text, true);
  PERFORM public.set_own_account_type('specialist', 'A');

  -- A trava de privilégio de coluna continua sendo a barreira real contra a
  -- auto-promoção; o evento abaixo registra só uma mudança que já foi aceita.
  BEGIN
    UPDATE public.profiles SET account_type = 'admin' WHERE id = conta;
    RAISE EXCEPTION 'AUTO-PROMOÇÃO: usuário alterou account_type diretamente';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  RESET ROLE;
  -- O recurso da conta é o pseudônimo dela: o UUID ao lado do subject_hash o
  -- desfaria. Conferido antes da contagem para o erro nomear o dano certo.
  IF EXISTS (
    SELECT 1 FROM private.security_audit_events
     WHERE subject_hash = private.audit_principal_hash(conta) AND resource_id = conta::text
  ) THEN
    RAISE EXCEPTION 'UUID EM CLARO: evento de papel/status gravou o UUID da conta no resource_id';
  END IF;

  SELECT count(*) INTO eventos_auditados
    FROM private.security_audit_events
   WHERE event_type = 'authorization.account_role.set_specialist'
     AND outcome = 'succeeded'
     AND actor_hash = private.audit_principal_hash(conta)
     AND subject_hash = private.audit_principal_hash(conta)
     AND resource_type = 'account'
     AND resource_id = private.audit_principal_hash(conta);
  IF eventos_auditados <> 1 THEN
    RAISE EXCEPTION 'AUDITORIA AUSENTE: mudança de papel gerou % eventos, esperado 1', eventos_auditados;
  END IF;

  SELECT count(*) INTO eventos_auditados
    FROM private.security_audit_events
   WHERE event_type = 'authorization.account_status.set_invited'
     AND outcome = 'succeeded'
     AND actor_hash = private.audit_principal_hash(conta)
     AND subject_hash = private.audit_principal_hash(conta)
     AND resource_type = 'account'
     AND resource_id = private.audit_principal_hash(conta);
  IF eventos_auditados <> 1 THEN
    RAISE EXCEPTION 'AUDITORIA AUSENTE: mudança de status gerou % eventos, esperado 1', eventos_auditados;
  END IF;

  RAISE NOTICE 'ok  papel/status auditados pela RPC e auto-promoção direta recusada';
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

  INSERT INTO public.workout_session_vitals
    (session_id, avg_heart_rate, zone_1_pct, zone_2_pct, zone_3_pct, zone_4_pct, zone_5_pct)
  VALUES (sessao_a, 164, 5, 15, 40, 30, 10);

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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  -- As zonas (0054) moram na linha da média: a mesma revogação as fecha. Contar
  -- pelas zonas, e não só pela linha, é o que acusa se um dia elas forem parar
  -- noutro lugar legível.
  SELECT count(*) INTO vazou
    FROM public.workout_session_vitals
   WHERE session_id = sessao_a
     AND num_nulls(zone_1_pct, zone_2_pct, zone_3_pct, zone_4_pct, zone_5_pct) < 5;
  IF vazou <> 0 THEN
    RAISE EXCEPTION 'CONSENTIMENTO IGNORADO: aluno revogou e o especialista ainda lê a FC e as zonas (% linha(s))', vazou;
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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);

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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);

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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
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
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
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

-- ── A medida declarada (0056) ────────────────────────────────────────────────
-- `physical_assessments` passa a guardar a medida do especialista e a declarada
-- pelo próprio aluno (issue #312). O /lgpd-check decidiu, e cada ponto é travado
-- aqui por comportamento:
--
--   1. só o Praticante (sem especialista ativo) declara, e só com consentimento
--      vigente no banco (Art. 11, I);
--   2. o aluno corrige e apaga só o que declarou (Art. 18, III e VI); a medida do
--      especialista continua imutável para ele (Art. 6°, V);
--   3. ninguém grava a origem errada: o aluno não grava `specialist`, o
--      especialista não grava `self`, e a declarada não tem especialista;
--   4. o aluno não grava medida no nome de outro aluno (Art. 6°, VII);
--   5. o especialista vinculado e com consentimento lê a declarada.

BEGIN;

DO $$
DECLARE
  praticante uuid := gen_random_uuid();
  aluno      uuid := gen_random_uuid();
  sem_aceite uuid := gen_random_uuid();
  espec      uuid := gen_random_uuid();
  medida_do_espec uuid;
  afetadas   int;
  visiveis   int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (praticante, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ma@elevapro.local', '{"full_name":"P","account_type":"student"}'::jsonb),
    (aluno,      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-mb@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (sem_aceite, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-mc@elevapro.local', '{"full_name":"S","account_type":"student"}'::jsonb),
    (espec,      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-me@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb);

  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES
    (praticante, 'health_data_collection', now(), '1.8'),
    (aluno,      'health_data_collection', now(), '1.8');

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno, espec, 'personal_training', 'active');

  -- Uma medida do especialista, gravada como ele grava, para o aluno tentar mexer.
  INSERT INTO public.physical_assessments (student_id, specialist_id, weight_kg, height_cm, measured_by)
  VALUES (aluno, espec, 80, 180, 'specialist')
  RETURNING id INTO medida_do_espec;

  -- A declarada não tem especialista, nem gravada pelo dono do banco.
  BEGIN
    INSERT INTO public.physical_assessments (student_id, specialist_id, weight_kg, height_cm, measured_by)
    VALUES (praticante, espec, 70, 170, 'self');
    RAISE EXCEPTION 'ORIGEM FALSIFICADA: medida declarada gravada com especialista';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  SET LOCAL ROLE authenticated;

  -- 1 e 2. O Praticante com consentimento declara e corrige o que declarou.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', praticante, 'role', 'authenticated')::text, true);
  INSERT INTO public.physical_assessments (student_id, weight_kg, height_cm, measured_by)
  VALUES (praticante, 72, 175, 'self');
  UPDATE public.physical_assessments SET weight_kg = 71.5 WHERE student_id = praticante;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 1 THEN
    RAISE EXCEPTION 'o Praticante não corrige a medida que declarou (Art. 18, III): % linha(s)', afetadas;
  END IF;

  -- 3. O aluno não se passa por especialista.
  BEGIN
    INSERT INTO public.physical_assessments (student_id, weight_kg, height_cm, measured_by)
    VALUES (praticante, 72, 175, 'specialist');
    RAISE EXCEPTION 'ORIGEM FALSIFICADA: aluno gravou medida como se fosse do especialista';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 4. Nem no nome de outro aluno.
  BEGIN
    INSERT INTO public.physical_assessments (student_id, weight_kg, height_cm, measured_by)
    VALUES (sem_aceite, 60, 160, 'self');
    RAISE EXCEPTION 'REGISTRO ALHEIO: Praticante gravou medida no nome de outro aluno';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 2. E apaga o que declarou.
  DELETE FROM public.physical_assessments WHERE student_id = praticante;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 1 THEN
    RAISE EXCEPTION 'o Praticante não apaga a medida que declarou (Art. 18, VI): % linha(s)', afetadas;
  END IF;

  -- 1. Com especialista ativo, quem mede é ele.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.physical_assessments (student_id, weight_kg, height_cm, measured_by)
    VALUES (aluno, 81, 180, 'self');
    RAISE EXCEPTION 'DECLARAÇÃO DO ALUNO ACOMPANHADO: aluno com especialista ativo declarou medida';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 2. A medida do especialista continua imutável para o aluno.
  UPDATE public.physical_assessments SET weight_kg = 60 WHERE id = medida_do_espec;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'HISTÓRICO CLÍNICO REESCRITO: aluno alterou medida do especialista';
  END IF;
  DELETE FROM public.physical_assessments WHERE id = medida_do_espec;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'HISTÓRICO CLÍNICO APAGADO: aluno apagou medida do especialista';
  END IF;

  -- 1. Sem consentimento, o banco recusa a coleta.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', sem_aceite, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.physical_assessments (student_id, weight_kg, height_cm, measured_by)
    VALUES (sem_aceite, 60, 160, 'self');
    RAISE EXCEPTION 'COLETA SEM CONSENTIMENTO: medida declarada gravada por quem não autorizou (Art. 11, I)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 3. O especialista não grava linha `self` que o aluno depois corrigiria como sua.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  BEGIN
    INSERT INTO public.physical_assessments (student_id, weight_kg, height_cm, measured_by)
    VALUES (aluno, 79, 180, 'self');
    RAISE EXCEPTION 'ORIGEM FALSIFICADA: especialista gravou medida como declarada pelo aluno';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RESET ROLE;

  -- 5. O especialista vinculado lê a medida que o aluno declarou antes do vínculo.
  INSERT INTO public.physical_assessments (student_id, weight_kg, height_cm, measured_by)
  VALUES (aluno, 78, 180, 'self');
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visiveis FROM public.physical_assessments
  WHERE student_id = aluno AND measured_by = 'self';
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'o especialista vinculado não lê a medida declarada pelo aluno (viu %)', visiveis;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  medida declarada: só o Praticante declara, com consentimento; corrige e apaga só a dele';
END $$;

ROLLBACK;

-- ── A nota do especialista (0057) ────────────────────────────────────────────
-- A nota que o especialista escreve sobre o progresso do Aluno (issue #312 §4).
-- O /lgpd-check decidiu, e cada ponto é travado aqui por comportamento:
--
--   1. o Aluno lê a própria nota, sempre — inclusive depois de revogar;
--   2. o autor lê, corrige e apaga a nota dele;
--   3. outro especialista do mesmo aluno não lê nada;
--   4. revogado o consentimento, o autor para de ler (Art. 11, I);
--   5. ninguém reescreve nota alheia, e o aluno não escreve nota clínica nenhuma.

BEGIN;

DO $$
DECLARE
  aluno    uuid := gen_random_uuid();
  revogou  uuid := gen_random_uuid();
  autor    uuid := gen_random_uuid();
  outro    uuid := gen_random_uuid();
  estranho uuid := gen_random_uuid();
  encerrou uuid := gen_random_uuid();
  nota     uuid;
  nota_rev uuid;
  afetadas int;
  visiveis int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-na@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (revogou, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-nr@elevapro.local', '{"full_name":"R","account_type":"student"}'::jsonb),
    (autor,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-n1@elevapro.local', '{"full_name":"E1","account_type":"specialist"}'::jsonb),
    (outro,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-n2@elevapro.local', '{"full_name":"E2","account_type":"specialist"}'::jsonb),
    (estranho,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-n3@elevapro.local', '{"full_name":"E3","account_type":"specialist"}'::jsonb),
    (encerrou,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-n4@elevapro.local', '{"full_name":"E4","account_type":"specialist"}'::jsonb);

  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES (aluno, 'health_data_collection', now(), '1.8'),
         (revogou, 'health_data_collection', now(), '1.8');

  -- Os dois especialistas atendem o mesmo aluno: sem isso, "o outro não lê"
  -- passaria pelo vínculo, e não pela autoria, que é o que esta trava protege.
  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno, autor, 'personal_training', 'active'),
         (aluno, outro, 'nutrition_consulting', 'active'),
         (revogou, autor, 'personal_training', 'active'),
         -- O que já foi embora: a nota que ele escreveu não o segue.
         (aluno, encerrou, 'personal_training', 'inactive');

  SET LOCAL ROLE authenticated;

  -- 2. O autor escreve a nota do aluno que ele acompanha.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', autor, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  INSERT INTO public.specialist_notes (student_id, specialist_id, body)
  VALUES (aluno, autor, 'Progresso consistente na semana.')
  RETURNING id INTO nota;

  INSERT INTO public.specialist_notes (student_id, specialist_id, body)
  VALUES (revogou, autor, 'Nota do aluno que vai revogar.')
  RETURNING id INTO nota_rev;

  -- 2. O autor lê e corrige a própria nota. Sem este positivo, a trava toda
  -- passaria com uma política que não deixa ninguém ler nada.
  SELECT count(*) INTO visiveis FROM public.specialist_notes WHERE id = nota;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'o autor não lê a nota que escreveu (viu %)', visiveis;
  END IF;

  UPDATE public.specialist_notes SET body = 'Progresso consistente, com ajuste de volume.'
  WHERE id = nota;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 1 THEN
    RAISE EXCEPTION 'o autor não corrige a própria nota: % linha(s)', afetadas;
  END IF;

  -- 5. E não escreve no nome de outro especialista.
  BEGIN
    INSERT INTO public.specialist_notes (student_id, specialist_id, body)
    VALUES (aluno, outro, 'Nota assinada por quem não escreveu.');
    RAISE EXCEPTION 'AUTORIA FALSIFICADA: especialista gravou nota no nome de outro';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 3. O outro especialista do mesmo aluno não lê a nota do colega.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', outro, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.specialist_notes WHERE student_id = aluno;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'NOTA LIDA POR OUTRO ESPECIALISTA: o não-autor viu % nota(s)', visiveis;
  END IF;

  -- 5. Nem reescreve nem apaga.
  UPDATE public.specialist_notes SET body = 'reescrita' WHERE id = nota;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'NOTA REESCRITA POR QUEM NÃO ESCREVEU: % linha(s)', afetadas;
  END IF;
  DELETE FROM public.specialist_notes WHERE id = nota;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'NOTA APAGADA POR QUEM NÃO ESCREVEU: % linha(s)', afetadas;
  END IF;

  -- 3. Especialista sem vínculo nenhum com o aluno não lê, nem escreve.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', estranho, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.specialist_notes WHERE student_id = aluno;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'NOTA LIDA SEM VÍNCULO: especialista de fora viu % nota(s)', visiveis;
  END IF;
  BEGIN
    INSERT INTO public.specialist_notes (student_id, specialist_id, body)
    VALUES (aluno, estranho, 'Nota de quem não acompanha este aluno.');
    RAISE EXCEPTION 'NOTA ESCRITA SEM VÍNCULO: especialista de fora gravou nota';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 3. E o que encerrou o vínculo perde o alcance junto com ele.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', encerrou, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.specialist_notes (student_id, specialist_id, body)
    VALUES (aluno, encerrou, 'Nota depois do fim do vínculo.');
    RAISE EXCEPTION 'NOTA ESCRITA APÓS O FIM DO VÍNCULO: o ex-especialista gravou nota';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 1. O aluno lê a nota sobre ele.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.specialist_notes WHERE student_id = aluno;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'o aluno não lê a nota escrita sobre ele (viu %)', visiveis;
  END IF;

  -- 5. E não escreve nota clínica nenhuma: o registro é do profissional.
  BEGIN
    INSERT INTO public.specialist_notes (student_id, specialist_id, body)
    VALUES (aluno, aluno, 'Nota que o aluno escreveu sobre si.');
    RAISE EXCEPTION 'ALUNO ESCREVE NOTA CLÍNICA: o registro do profissional aceitou linha do titular';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 4. Revogado o consentimento, o autor para de ler — e o aluno continua lendo.
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now()
  WHERE student_id = revogou AND consent_type = 'health_data_collection';

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', autor, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visiveis FROM public.specialist_notes WHERE student_id = revogou;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'NOTA SOBREVIVE À REVOGAÇÃO: o autor leu % nota(s) de quem revogou (Art. 11, I)', visiveis;
  END IF;

  -- 4. E também não apaga: o Postgres exige a política de SELECT para a linha do
  -- WHERE, então perder a leitura é perder o alcance inteiro. A nota fica com o
  -- aluno, que segue lendo, e sai pelo CASCADE da conta dele.
  DELETE FROM public.specialist_notes WHERE id = nota_rev;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'NOTA ALCANÇADA APÓS REVOGAÇÃO: o autor apagou % nota(s) de quem revogou', afetadas;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', revogou, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.specialist_notes WHERE student_id = revogou;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'o aluno que revogou perdeu a própria nota (viu %)', visiveis;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'ok  nota do especialista: só o autor escreve e corrige, o aluno lê, a revogação fecha';
END $$;

ROLLBACK;

-- ── O placar da semana (0058, 0059) ──────────────────────────────────────────
-- O ranking com a tabela de pontos e o opt-in (issue #320). O /lgpd-check
-- decidiu, e cada ponto é travado aqui por comportamento:
--
--   1. o ponto sai só do treino concluído: 100 por sessão, até 2 por dia, nada
--      no futuro, e nenhuma refeição, água ou meta de dieta pontua (Art. 11);
--   2. o aluno não grava a própria pontuação (Art. 6°, V);
--   3. o global mostra só quem consentiu na versão vigente, com nome abreviado e
--      sem foto (Art. 7°, I; Art. 6°, III), e só para quem também participa;
--   4. revogar tira a pessoa do global na mesma consulta (Art. 8°, §5°);
--   5. o placar de alunos é só do especialista, e só dos vínculos ativos
--      (Art. 6°, VII);
--   6. excluir a conta apaga os pontos (Art. 16; Art. 18, VI).

-- 1 e 3, pela estrutura: nenhuma outra tabela alimenta o placar, e a leitura não
-- tem por onde devolver foto ou e-mail.
DO $$
DECLARE
  sources  text[];
  leaked_columns  text[];
BEGIN
  SELECT array_agg(DISTINCT c.relname::text ORDER BY c.relname::text) INTO sources
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_proc f ON f.oid = t.tgfoid
  WHERE NOT t.tgisinternal
    AND f.prosrc ~ 'ranking';

  -- Refeição e água no placar diriam a desconhecidos quem segue a dieta.
  IF sources IS DISTINCT FROM ARRAY['workout_sessions'] THEN
    RAISE EXCEPTION 'PLACAR COM DADO DE SAÚDE: tabelas que alimentam o ranking: % (esperado só workout_sessions)',
      COALESCE(array_to_string(sources, ', '), 'nenhuma');
  END IF;

  SELECT array_agg(a) INTO leaked_columns
  FROM pg_proc f, unnest(f.proargnames) AS a
  WHERE f.proname = 'get_leaderboard'
    AND a ~ 'avatar|email|photo|specialist';

  IF leaked_columns IS NOT NULL THEN
    RAISE EXCEPTION 'PLACAR EXPÕE MAIS QUE O NOME: get_leaderboard devolve %', array_to_string(leaked_columns, ', ');
  END IF;

  IF has_function_privilege('anon', 'public.get_leaderboard(text, date)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PLACAR PÚBLICO: a chave anônima executa get_leaderboard';
  END IF;

  RAISE NOTICE 'ok  placar: só o treino pontua, a leitura não devolve foto, anon não lê';
END $$;

BEGIN;

DO $$
DECLARE
  ana         uuid := gen_random_uuid();
  bia         uuid := gen_random_uuid();
  outsider    uuid := gen_random_uuid();
  leaver      uuid := gen_random_uuid();
  stranger    uuid := gen_random_uuid();
  mononym     uuid := gen_random_uuid();
  stale       uuid := gen_random_uuid();
  specialist  uuid := gen_random_uuid();
  specialist2 uuid := gen_random_uuid();
  -- Calculadas antes de trocar de papel: `private` não é do cliente.
  this_week   date := private.ranking_week_start(now());
  week        date := this_week - 7;
  -- Terça às 10h da semana passada, no horário de Brasília.
  tuesday     timestamptz := ((week + 1)::timestamp + time '10:00') AT TIME ZONE 'America/Sao_Paulo';
  ana_points  int;
  affected    int;
  names       text[];
  ids         uuid[];
  entry       record;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (ana,         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ra@elevapro.local', '{"full_name":"Ana Clara Dias","account_type":"student"}'::jsonb),
    (bia,         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-rb@elevapro.local', '{"full_name":"Beatriz Souza Lima","account_type":"student"}'::jsonb),
    (outsider,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-rf@elevapro.local', '{"full_name":"Fora do Placar","account_type":"student"}'::jsonb),
    (leaver,      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-rs@elevapro.local', '{"full_name":"Saiu Depois","account_type":"student"}'::jsonb),
    (stranger,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-rx@elevapro.local', '{"full_name":"Aluno Alheio","account_type":"student"}'::jsonb),
    (mononym,     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-rm@elevapro.local', '{"full_name":"Madonna","account_type":"student"}'::jsonb),
    (stale,       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-rv@elevapro.local', '{"full_name":"Versao Antiga","account_type":"student"}'::jsonb),
    (specialist,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-re@elevapro.local', '{"full_name":"E1","account_type":"specialist"}'::jsonb),
    (specialist2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-re2@elevapro.local', '{"full_name":"E2","account_type":"specialist"}'::jsonb);

  -- O `stale` aceitou um texto que não é mais o vigente.
  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES (ana, 'ranking', now(), private.ranking_consent_version()),
         (bia, 'ranking', now(), private.ranking_consent_version()),
         (leaver, 'ranking', now(), private.ranking_consent_version()),
         (stranger, 'ranking', now(), private.ranking_consent_version()),
         (mononym, 'ranking', now(), private.ranking_consent_version()),
         (stale, 'ranking', now(), '0.9');

  -- O stranger foi aluno do specialist e hoje é do specialist2: o vínculo
  -- encerrado não conta.
  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (ana, specialist, 'personal_training', 'active'),
         (outsider, specialist, 'personal_training', 'active'),
         (stranger, specialist, 'personal_training', 'inactive'),
         (stranger, specialist2, 'personal_training', 'active');

  SET LOCAL ROLE authenticated;

  -- 1. Três sessões no mesmo dia valem 200, não 300; a de outro dia soma 100 à
  -- parte; a sessão com data no futuro e a que não foi concluída não valem nada.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  INSERT INTO public.workout_sessions (student_id, started_at, completed_at)
  VALUES (ana, tuesday - interval '1 hour', tuesday),
         (ana, tuesday, tuesday + interval '5 minutes'),
         (ana, tuesday, tuesday + interval '10 minutes'),
         (ana, tuesday + interval '1 day', tuesday + interval '1 day'),
         (ana, tuesday + interval '2 days', NULL),
         (ana, now(), now() + interval '8 days');

  SELECT rs.points INTO ana_points FROM public.ranking_scores rs
  WHERE rs.student_id = ana AND rs.week_start_date = week;
  IF ana_points IS DISTINCT FROM 300 THEN
    RAISE EXCEPTION 'PLACAR INFLÁVEL: 3 sessões num dia, 1 no outro e 1 sem conclusão deram % pontos (esperado 300)', ana_points;
  END IF;

  SELECT count(*) INTO affected FROM public.ranking_scores rs
  WHERE rs.student_id = ana AND rs.week_start_date > this_week;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'PONTO ANTECIPADO: sessão com data no futuro pontuou em % semana(s)', affected;
  END IF;

  -- 2. O aluno não grava, não corrige e não apaga a própria pontuação.
  BEGIN
    INSERT INTO public.ranking_scores (student_id, week_start_date, points)
    VALUES (ana, this_week, 99999);
    RAISE EXCEPTION 'PONTUAÇÃO FORJADA: o aluno inseriu a própria linha no placar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.ranking_scores SET points = 99999 WHERE student_id = ana;
    RAISE EXCEPTION 'PONTUAÇÃO FORJADA: o aluno alterou os próprios pontos';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.ranking_scores WHERE student_id = ana;
    RAISE EXCEPTION 'PONTUAÇÃO APAGADA PELO CLIENTE: o aluno apagou a própria linha';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- As outras pessoas pontuam uma vez na mesma semana; a Bia também na anterior.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', bia, 'role', 'authenticated')::text, true);
  INSERT INTO public.workout_sessions (student_id, started_at, completed_at)
  VALUES (bia, tuesday, tuesday),
         (bia, tuesday - interval '7 days', tuesday - interval '7 days');

  FOR entry IN SELECT unnest(ARRAY[outsider, leaver, stranger, mononym, stale]) AS id LOOP
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', entry.id, 'role', 'authenticated')::text, true);
    INSERT INTO public.workout_sessions (student_id, started_at, completed_at)
    VALUES (entry.id, tuesday, tuesday);
  END LOOP;

  -- A linha é do dono: a Ana lê a dela e não a da Bia.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO affected FROM public.ranking_scores rs WHERE rs.student_id = ana;
  IF affected = 0 THEN
    RAISE EXCEPTION 'a aluna não lê a própria pontuação';
  END IF;
  SELECT count(*) INTO affected FROM public.ranking_scores rs WHERE rs.student_id = bia;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'PONTUAÇÃO ALHEIA LIDA PELA TABELA: a aluna leu % linha(s) de outra pessoa', affected;
  END IF;

  -- 3. O global da Ana: quem consentiu na versão vigente, com nome abreviado (o
  -- de uma palavra fica como está), e o dela inteiro.
  SELECT array_agg(g.display_name ORDER BY g.display_name) INTO names
  FROM public.get_leaderboard('global', week) g;
  IF names IS DISTINCT FROM ARRAY['Aluno A.', 'Ana Clara Dias', 'Beatriz L.', 'Madonna', 'Saiu D.'] THEN
    RAISE EXCEPTION 'PLACAR SEM CONSENTIMENTO VIGENTE OU COM NOME INTEIRO: o global mostrou %', names;
  END IF;

  -- A posição da semana anterior: a Bia era a única, a Ana é nova.
  SELECT * INTO entry FROM public.get_leaderboard('global', week) g WHERE g.student_id = bia;
  IF entry.previous_rank IS DISTINCT FROM 1 OR entry.rank IS DISTINCT FROM 2 OR entry.is_me THEN
    RAISE EXCEPTION 'posição da Bia errada: rank %, anterior %, is_me %', entry.rank, entry.previous_rank, entry.is_me;
  END IF;
  SELECT * INTO entry FROM public.get_leaderboard('global', week) g WHERE g.student_id = ana;
  IF entry.rank IS DISTINCT FROM 1 OR entry.previous_rank IS NOT NULL OR NOT entry.is_me THEN
    RAISE EXCEPTION 'posição da Ana errada: rank %, anterior %, is_me %', entry.rank, entry.previous_rank, entry.is_me;
  END IF;

  -- 3. Quem não participa não lê o global — nem quem aceitou um texto antigo.
  FOR entry IN SELECT unnest(ARRAY[outsider, stale]) AS id LOOP
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', entry.id, 'role', 'authenticated')::text, true);
    BEGIN
      PERFORM * FROM public.get_leaderboard('global', week);
      RAISE EXCEPTION 'PLACAR SEM RECIPROCIDADE: quem não tem o aceite vigente leu o global';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;

  -- 3. Nem o especialista, que não é participante.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  BEGIN
    PERFORM * FROM public.get_leaderboard('global', week);
    RAISE EXCEPTION 'PLACAR PARA QUEM NÃO PARTICIPA: o especialista leu o global';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 5. O especialista vê os vínculos ativos, com ou sem opt-in, e nenhum outro.
  SELECT array_agg(g.student_id ORDER BY g.student_id) INTO ids
  FROM public.get_leaderboard('my_students', week) g;
  IF ids IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY[ana, outsider]) x) THEN
    RAISE EXCEPTION 'PLACAR DE ALUNO ALHEIO: o especialista viu % (esperado só os vínculos ativos)', ids;
  END IF;

  SELECT count(*) INTO affected FROM public.ranking_scores rs WHERE rs.student_id = stranger;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'PONTUAÇÃO LIDA APÓS O FIM DO VÍNCULO: o ex-especialista leu % linha(s)', affected;
  END IF;

  -- 5. O aluno não pede o placar de alunos.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', ana, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM * FROM public.get_leaderboard('my_students', week);
    RAISE EXCEPTION 'PLACAR DE ESPECIALISTA NA MÃO DO ALUNO: my_students respondeu a uma aluna';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 4. Revogar tira a pessoa do global na hora.
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now()
  WHERE student_id = leaver AND consent_type = 'ranking';

  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO affected FROM public.get_leaderboard('global', week) g WHERE g.student_id = leaver;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'REVOGAÇÃO SEM EFEITO NO PLACAR: quem saiu do ranking continua no global';
  END IF;

  -- 6. Excluir a conta leva os pontos junto, sem o trigger tropeçar na cascata.
  -- A eliminação parte de `profiles` (LGPD_COMPLIANCE.md §5): `auth.users` não
  -- tem FK para o perfil.
  RESET ROLE;
  DELETE FROM public.profiles WHERE id = bia;
  SELECT count(*) INTO affected FROM public.ranking_scores rs WHERE rs.student_id = bia;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'PONTOS SOBREVIVEM À CONTA: % linha(s) da conta excluída ficaram', affected;
  END IF;

  RAISE NOTICE 'ok  placar: só o trigger pontua, o global só com aceite vigente, a conta apagada leva os pontos';
END $$;

ROLLBACK;

-- ── Plano de dieta: rascunho, autoria, vínculo e consentimento (#337) ────────
--
-- O /lgpd-check da #337 decidiu, e cada ponto é travado aqui por comportamento:
--
--   1. o aluno não lê o rascunho do especialista — plano, refeição nem item —
--      e lê depois de enviado;
--   2. o aluno lê a prescrição, mas não a reescreve (Art. 6°, V);
--   3. especialista sem vínculo, ou com o consentimento do aluno revogado, não
--      lê nem grava; e não cria plano para aluno que não é dele;
--   4. o Praticante cria o próprio plano só com consentimento (Art. 11, I);
--   5. enviar finaliza o ativo de outro autor, só aceita rascunho, exige MFA e
--      deixa evento sem conteúdo, com o plano pseudonimizado;
--   6. o rascunho sai no fim do vínculo e depois de 90 dias (Art. 15, I).

BEGIN;

DO $$
DECLARE
  aluno      uuid := gen_random_uuid();
  revogou    uuid := gen_random_uuid();
  praticante uuid := gen_random_uuid();
  semcons    uuid := gen_random_uuid();
  autor      uuid := gen_random_uuid();
  estranho   uuid := gen_random_uuid();
  alimento   uuid;
  anterior   uuid;
  rascunho   uuid;
  outro_rasc uuid;
  refeicao   uuid;
  plano_rev  uuid;
  velho      uuid;
  afetadas   int;
  visiveis   int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno,      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-da@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (revogou,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-dr@elevapro.local', '{"full_name":"R","account_type":"student"}'::jsonb),
    (praticante, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-dp@elevapro.local', '{"full_name":"P","account_type":"student"}'::jsonb),
    (semcons,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ds@elevapro.local', '{"full_name":"S","account_type":"student"}'::jsonb),
    (autor,      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-d1@elevapro.local', '{"full_name":"E1","account_type":"specialist"}'::jsonb),
    (estranho,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-d2@elevapro.local', '{"full_name":"E2","account_type":"specialist"}'::jsonb);

  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES (aluno, 'health_data_collection', now(), '1.8'),
         (revogou, 'health_data_collection', now(), '1.8'),
         (praticante, 'health_data_collection', now(), '1.8');

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno, autor, 'nutrition_consulting', 'active'),
         (revogou, autor, 'nutrition_consulting', 'active');

  INSERT INTO public.foods (name) VALUES ('Arroz verify') RETURNING id INTO alimento;

  -- O plano que o aluno segue hoje foi montado por ele mesmo: é de outro autor,
  -- que a RLS do especialista não alcança. Enviar precisa finalizá-lo assim mesmo.
  INSERT INTO public.diet_plans (student_id, specialist_id, name, status, start_date, end_date)
  VALUES (aluno, NULL, 'Plano atual', 'active', CURRENT_DATE, CURRENT_DATE + 30) RETURNING id INTO anterior;

  SET LOCAL ROLE authenticated;

  -- 3. O autor vinculado cria o rascunho, com refeição e item, e lê o que criou.
  -- Sem este positivo, a trava toda passaria com política que nega tudo.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', autor, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  INSERT INTO public.diet_plans (student_id, specialist_id, name, status, start_date, end_date)
  VALUES (aluno, autor, 'Próxima dieta', 'draft', CURRENT_DATE, CURRENT_DATE + 30) RETURNING id INTO rascunho;
  INSERT INTO public.diet_meals (diet_plan_id, name) VALUES (rascunho, 'Almoço')
  RETURNING id INTO refeicao;
  INSERT INTO public.diet_meal_items (diet_meal_id, food_id, quantity, unit)
  VALUES (refeicao, alimento, 150, 'g');

  SELECT count(*) INTO visiveis FROM public.diet_meal_items i
    JOIN public.diet_meals m ON m.id = i.diet_meal_id WHERE m.diet_plan_id = rascunho;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'o autor não lê o item do rascunho que montou (viu %)', visiveis;
  END IF;

  -- 3. E não cria plano para quem não é aluno dele.
  BEGIN
    INSERT INTO public.diet_plans (student_id, specialist_id, name, status, start_date, end_date)
    VALUES (praticante, autor, 'Plano alheio', 'draft', CURRENT_DATE, CURRENT_DATE + 30);
    RAISE EXCEPTION 'PRESCRIÇÃO SEM VÍNCULO: especialista criou plano para quem não atende';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 1. O aluno não enxerga o rascunho em nenhuma das três tabelas.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.diet_plans WHERE id = rascunho;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'RASCUNHO EXPOSTO: o aluno leu o plano ainda em montagem';
  END IF;
  SELECT count(*) INTO visiveis FROM public.diet_meals WHERE id = refeicao;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'RASCUNHO EXPOSTO: o aluno leu a refeição do plano em montagem';
  END IF;
  SELECT count(*) INTO visiveis FROM public.diet_meal_items WHERE diet_meal_id = refeicao;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'RASCUNHO EXPOSTO: o aluno leu o item do plano em montagem';
  END IF;

  -- 3. Especialista sem vínculo não lê, e não envia.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', estranho, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visiveis FROM public.diet_plans WHERE student_id = aluno;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'DIETA LIDA SEM VÍNCULO: especialista de fora viu % plano(s)', visiveis;
  END IF;
  BEGIN
    PERFORM public.activate_diet_plan(rascunho);
    RAISE EXCEPTION 'DIETA ENVIADA SEM VÍNCULO: especialista de fora ativou plano alheio';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 5. Enviar ativa o rascunho e finaliza o plano do outro autor. A função
  -- escapa da RLS e confere a trava MFA por conta própria; o especialista
  -- envia por senha (ADR-0047).
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', autor, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  PERFORM public.activate_diet_plan(rascunho);

  BEGIN
    PERFORM public.activate_diet_plan(rascunho);
    RAISE EXCEPTION 'REENVIO ACEITO: activate_diet_plan ativou plano que não era rascunho';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RESET ROLE;
  SELECT count(*) INTO visiveis FROM public.diet_plans WHERE student_id = aluno AND status = 'active';
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'DOIS PLANOS ATIVOS: o aluno ficou com % plano(s) ativo(s)', visiveis;
  END IF;
  IF (SELECT status FROM public.diet_plans WHERE id = anterior) <> 'finished' THEN
    RAISE EXCEPTION 'PLANO ANTERIOR ATIVO: enviar não finalizou o plano de outro autor';
  END IF;

  -- 5. O evento existe, e o plano entra pseudonimizado: o UUID em claro é
  -- correlacionável com o aluno e não pertence à trilha (padrão da 0071).
  SELECT count(*) INTO visiveis FROM private.security_audit_events
   WHERE event_type = 'health.diet_plan.activated'
     AND resource_type = 'diet_plan'
     AND resource_id = private.audit_principal_hash(rascunho);
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'ENVIO SEM RASTRO: % evento(s) de ativação pseudonimizado(s)', visiveis;
  END IF;
  SELECT count(*) INTO visiveis FROM private.security_audit_events
   WHERE resource_type = 'diet_plan' AND resource_id IN (rascunho::text, anterior::text);
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'PLANO EM CLARO NA TRILHA: % evento(s) com o UUID do plano', visiveis;
  END IF;

  -- 1. Enviado, o aluno lê o item.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO visiveis FROM public.diet_meal_items WHERE diet_meal_id = refeicao;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'o aluno não lê o plano que recebeu (viu % item)', visiveis;
  END IF;

  -- 2. Mas não reescreve a prescrição.
  UPDATE public.diet_meal_items SET quantity = 999 WHERE diet_meal_id = refeicao;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'PRESCRIÇÃO REESCRITA PELO ALUNO: % item(ns) alterado(s)', afetadas;
  END IF;
  DELETE FROM public.diet_meals WHERE id = refeicao;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'PRESCRIÇÃO APAGADA PELO ALUNO: % refeição(ões)', afetadas;
  END IF;
  BEGIN
    INSERT INTO public.diet_meals (diet_plan_id, name) VALUES (rascunho, 'Refeição do aluno');
    RAISE EXCEPTION 'PRESCRIÇÃO ALTERADA PELO ALUNO: refeição inserida no plano do especialista';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 3. Revogado o consentimento, o autor para de ler (Art. 11, I).
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', autor, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  INSERT INTO public.diet_plans (student_id, specialist_id, name, status, start_date, end_date)
  VALUES (revogou, autor, 'Plano de quem vai revogar', 'draft', CURRENT_DATE, CURRENT_DATE + 30) RETURNING id INTO plano_rev;
  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now()
   WHERE student_id = revogou AND consent_type = 'health_data_collection';
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO visiveis FROM public.diet_plans WHERE id = plano_rev;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'REVOGAÇÃO SEM EFEITO NA DIETA: o autor segue lendo o plano de quem revogou';
  END IF;

  -- 4. O Praticante cria e lê o próprio rascunho; sem consentimento, não cria.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', praticante, 'role', 'authenticated')::text, true);
  INSERT INTO public.diet_plans (student_id, specialist_id, name, status, start_date, end_date)
  VALUES (praticante, NULL, 'Meu plano', 'draft', CURRENT_DATE, CURRENT_DATE + 30);
  SELECT count(*) INTO visiveis FROM public.diet_plans WHERE student_id = praticante;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'o Praticante não lê o próprio rascunho (viu %)', visiveis;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', semcons, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.diet_plans (student_id, specialist_id, name, status, start_date, end_date)
    VALUES (semcons, NULL, 'Plano sem consentimento', 'draft', CURRENT_DATE, CURRENT_DATE + 30);
    RAISE EXCEPTION 'DADO DE SAÚDE SEM CONSENTIMENTO: Praticante criou plano sem consentir';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 6. O rascunho sai quando o vínculo do autor termina…
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', autor, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  INSERT INTO public.diet_plans (student_id, specialist_id, name, status, start_date, end_date)
  VALUES (aluno, autor, 'Rascunho esquecido', 'draft', CURRENT_DATE, CURRENT_DATE + 30) RETURNING id INTO outro_rasc;
  RESET ROLE;
  UPDATE public.student_specialists SET status = 'inactive'
   WHERE student_id = aluno AND specialist_id = autor;
  IF EXISTS (SELECT 1 FROM public.diet_plans WHERE id = outro_rasc) THEN
    RAISE EXCEPTION 'RASCUNHO ÓRFÃO: o vínculo acabou e o rascunho de saúde ficou';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.diet_plans WHERE id = rascunho) THEN
    RAISE EXCEPTION 'PLANO ENVIADO APAGADO: o fim do vínculo levou o plano que o aluno segue';
  END IF;

  -- …e depois de 90 dias, sem levar o rascunho recente.
  INSERT INTO public.diet_plans (student_id, specialist_id, name, status, created_at, start_date, end_date)
  VALUES (praticante, NULL, 'Rascunho de 91 dias', 'draft', now() - interval '91 days', CURRENT_DATE, CURRENT_DATE + 30)
  RETURNING id INTO velho;
  PERFORM private.purge_stale_diet_plan_drafts();
  IF EXISTS (SELECT 1 FROM public.diet_plans WHERE id = velho) THEN
    RAISE EXCEPTION 'RASCUNHO SEM PRAZO: rascunho de 91 dias sobreviveu à limpeza';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.diet_plans WHERE student_id = praticante AND status = 'draft') THEN
    RAISE EXCEPTION 'RASCUNHO RECENTE APAGADO: a limpeza levou rascunho de hoje';
  END IF;

  RAISE NOTICE 'ok  dieta: rascunho invisível ao aluno, prescrição só do autor vinculado com consentimento, envio atômico e auditado, rascunho com prazo';
END $$;

ROLLBACK;

-- ── Preferências do plano: vocabulário fechado, sem diagnóstico (#337) ───────
--
-- LGPD (Art. 6°, III): a restrição do plano é exclusão de alimento. A anamnese
-- oferece "Diabetes" na mesma pergunta, e aceitar texto aberto aqui levaria o
-- diagnóstico para uma segunda tabela, sob outra política de acesso.

BEGIN;

DO $$
DECLARE
  aluno uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES (aluno, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'verify-pref@elevapro.local', '{"full_name":"P","account_type":"student"}'::jsonb);

  -- O positivo: as quatro etiquetas passam. Sem ele, um CHECK que recusa tudo
  -- passaria nesta trava.
  INSERT INTO public.diet_plans (student_id, name, status, start_date, end_date,
                                 dietary_restrictions, meals_per_day, free_meal_days)
  VALUES (aluno, 'Etiquetas válidas', 'draft', CURRENT_DATE, CURRENT_DATE + 30,
          ARRAY['lactose_free', 'gluten_free', 'vegetarian', 'vegan'], 5, ARRAY[0, 6]);

  BEGIN
    INSERT INTO public.diet_plans (student_id, name, status, start_date, end_date, dietary_restrictions)
    VALUES (aluno, 'Diagnóstico', 'draft', CURRENT_DATE, CURRENT_DATE + 30, ARRAY['diabetes']);
    RAISE EXCEPTION 'DIAGNÓSTICO NO PLANO: diet_plans aceitou "diabetes" como restrição';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.diet_plans (student_id, name, status, start_date, end_date, dietary_restrictions)
    VALUES (aluno, 'Texto livre', 'draft', CURRENT_DATE, CURRENT_DATE + 30,
            ARRAY['intolerante a lactose, sente dor abdominal']);
    RAISE EXCEPTION 'TEXTO LIVRE NO PLANO: diet_plans aceitou restrição fora do vocabulário';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.diet_plans (student_id, name, status, start_date, end_date, free_meal_days)
    VALUES (aluno, 'Dia inexistente', 'draft', CURRENT_DATE, CURRENT_DATE + 30, ARRAY[7]);
    RAISE EXCEPTION 'DIA INEXISTENTE: diet_plans aceitou refeição livre no dia 7';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'ok  preferências da dieta: só as quatro etiquetas de exclusão, sem diagnóstico nem texto livre';
END $$;

ROLLBACK;

-- ── student_anamnesis: gravar exige consentimento (0083, #365) ───────────────
-- A anamnese é consentimento explícito (Art. 11, I). O onboarding do Praticante
-- grava peso, altura e a triagem a cada tela, e quem recusou o aceite não pode
-- gravar por nenhum caminho, nem pelo PostgREST direto.

BEGIN;

DO $$
DECLARE
  com_aceite uuid := gen_random_uuid();
  sem_aceite uuid := gen_random_uuid();
  revogou    uuid := gen_random_uuid();
  afetadas   int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (com_aceite, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-aa@elevapro.local', '{"full_name":"A","account_type":"member"}'::jsonb),
    (sem_aceite, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ab@elevapro.local', '{"full_name":"B","account_type":"member"}'::jsonb),
    (revogou,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ac@elevapro.local', '{"full_name":"C","account_type":"member"}'::jsonb);

  INSERT INTO public.student_consents (student_id, consent_type, given_at, revoked_at, policy_version)
  VALUES
    (com_aceite, 'health_data_collection', now(), NULL,  '1.9'),
    (revogou,    'health_data_collection', now() - interval '1 day', now(), '1.9');

  -- Quem revogou já tinha anamnese: o dado antigo é dele e continua ali.
  INSERT INTO public.student_anamnesis (student_id, responses)
  VALUES (revogou, '{"weight":80}'::jsonb);

  SET LOCAL ROLE authenticated;

  -- Com aceite, grava e corrige: é o upsert de cada tela do onboarding.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', com_aceite, 'role', 'authenticated')::text, true);
  INSERT INTO public.student_anamnesis (student_id, responses) VALUES (com_aceite, '{"weight":70}'::jsonb);
  UPDATE public.student_anamnesis SET responses = '{"weight":71}'::jsonb WHERE student_id = com_aceite;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 1 THEN
    RAISE EXCEPTION 'o aluno com aceite não corrige a própria anamnese (Art. 18, III): % linha(s)', afetadas;
  END IF;

  -- Sem aceite, o banco recusa a coleta.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', sem_aceite, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.student_anamnesis (student_id, responses) VALUES (sem_aceite, '{"weight":60}'::jsonb);
    RAISE EXCEPTION 'COLETA SEM CONSENTIMENTO: anamnese gravada por quem não autorizou (Art. 11, I)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Revogado, não corrige; mas lê e apaga o que já é dele (§7 e Art. 18, VI).
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', revogou, 'role', 'authenticated')::text, true);
  BEGIN
    UPDATE public.student_anamnesis SET responses = '{"weight":90}'::jsonb WHERE student_id = revogou;
    RAISE EXCEPTION 'COLETA APÓS REVOGAÇÃO: anamnese alterada depois de o aluno retirar o aceite (Art. 8°, §5°)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT count(*) INTO afetadas FROM public.student_anamnesis WHERE student_id = revogou;
  IF afetadas <> 1 THEN
    RAISE EXCEPTION 'HISTÓRICO ESCONDIDO: quem revogou não lê a própria anamnese (% linha(s))', afetadas;
  END IF;

  DELETE FROM public.student_anamnesis WHERE student_id = revogou;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 1 THEN
    RAISE EXCEPTION 'ELIMINAÇÃO NEGADA: quem revogou não apaga a própria anamnese (Art. 18, VI)';
  END IF;

  RAISE NOTICE 'ok  anamnese: gravar e corrigir exigem aceite; ler e apagar o próprio dado, não';
END $$;

ROLLBACK;

-- ── foods: valores por porção (0084, #365) ──────────────────────────────────
-- O app lê `foods` por porção. O seed gravou valores de 100 g em porções
-- menores, e 10 g de azeite viraram 884 kcal no diário. A trava existe e recusa
-- o erro antigo; sem ela, o defeito volta pelo primeiro alimento cadastrado.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'foods' AND c.conname = 'foods_values_per_serving_plausible'
  ) THEN
    RAISE EXCEPTION 'ERRO DE PORÇÃO SEM BARREIRA: CHECK de plausibilidade ausente em foods';
  END IF;

  BEGIN
    INSERT INTO public.foods (name, category, serving_size, calories, fat)
    VALUES ('verify-azeite-por-100g', 'gordura', 10, 884, 100);
    RAISE EXCEPTION 'CALORIA DEZ VEZES MAIOR: foods aceitou 10 g com 884 kcal e 100 g de gordura';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'ok  alimentos: valores por porção, com trava contra os de 100 g';
END $$;

ROLLBACK;

-- ── workout_exercises: o Praticante troca o exercício do próprio treino (0085, #365)
-- O aluno não escreve prescrição. A troca "para sempre" do Praticante passa por
-- uma função que muda só o exercício, só em treino dele sem especialista, e só
-- para o catálogo oficial. Prescrição de especialista continua intocável.

BEGIN;

DO $$
DECLARE
  praticante    uuid := gen_random_uuid();
  outro         uuid := gen_random_uuid();
  especialista  uuid := gen_random_uuid();
  oficial       uuid;
  destino       uuid;
  privado       uuid;
  item_proprio  uuid;
  item_outro    uuid;
  item_prescrito uuid;
  atual         uuid;
  afetadas      int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (praticante, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-wa@elevapro.local', '{"full_name":"A","account_type":"member"}'::jsonb),
    (outro, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-wb@elevapro.local', '{"full_name":"B","account_type":"member"}'::jsonb),
    (especialista, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ws@elevapro.local', '{"full_name":"S","account_type":"specialist"}'::jsonb);

  INSERT INTO public.exercises (name) VALUES ('verify-remada-curvada') RETURNING id INTO oficial;
  INSERT INTO public.exercises (name) VALUES ('verify-remada-halteres') RETURNING id INTO destino;
  INSERT INTO public.exercises (name, created_by) VALUES ('verify-remada-do-especialista', especialista)
    RETURNING id INTO privado;

  WITH treino AS (
    INSERT INTO public.workouts (title, specialist_id, student_id)
    VALUES ('verify-proprio', NULL, praticante) RETURNING id
  )
  INSERT INTO public.workout_exercises (workout_id, exercise_id)
  SELECT id, oficial FROM treino RETURNING id INTO item_proprio;

  WITH treino AS (
    INSERT INTO public.workouts (title, specialist_id, student_id)
    VALUES ('verify-de-outro', NULL, outro) RETURNING id
  )
  INSERT INTO public.workout_exercises (workout_id, exercise_id)
  SELECT id, oficial FROM treino RETURNING id INTO item_outro;

  WITH treino AS (
    INSERT INTO public.workouts (title, specialist_id, student_id)
    VALUES ('verify-prescrito', especialista, praticante) RETURNING id
  )
  INSERT INTO public.workout_exercises (workout_id, exercise_id)
  SELECT id, oficial FROM treino RETURNING id INTO item_prescrito;

  IF has_function_privilege('anon', 'public.swap_workout_exercise(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TROCA ANÔNIMA: anon pode executar public.swap_workout_exercise';
  END IF;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', praticante, 'role', 'authenticated')::text, true);

  PERFORM public.swap_workout_exercise(item_proprio, destino);
  SELECT exercise_id INTO atual FROM public.workout_exercises WHERE id = item_proprio;
  IF atual IS DISTINCT FROM destino THEN
    RAISE EXCEPTION 'o Praticante não troca o exercício do próprio treino';
  END IF;

  BEGIN
    PERFORM public.swap_workout_exercise(item_outro, destino);
    RAISE EXCEPTION 'TREINO ALHEIO ALTERADO: um Praticante trocou exercício do treino de outra pessoa';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.swap_workout_exercise(item_prescrito, destino);
    RAISE EXCEPTION 'PRESCRIÇÃO REESCRITA: o aluno trocou um exercício que o especialista prescreveu';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.swap_workout_exercise(item_proprio, privado);
    RAISE EXCEPTION 'CATÁLOGO PRIVADO VAZADO: exercício de um especialista entrou no plano de quem não é aluno dele';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A função não abre a tabela: séries, carga e ordem seguem sem escrita direta.
  UPDATE public.workout_exercises SET sets = 99 WHERE id = item_proprio;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  IF afetadas <> 0 THEN
    RAISE EXCEPTION 'PRESCRIÇÃO EDITADA POR FORA: UPDATE direto em workout_exercises foi aceito para o aluno';
  END IF;

  RESET ROLE;
  SELECT exercise_id INTO atual FROM public.workout_exercises WHERE id = item_outro;
  IF atual IS DISTINCT FROM oficial THEN
    RAISE EXCEPTION 'TREINO ALHEIO ALTERADO: o item de outra pessoa mudou de exercício';
  END IF;

  RAISE NOTICE 'ok  troca de exercício: só no próprio treino sem especialista, só para o catálogo oficial';
END $$;

ROLLBACK;

-- ── exercise_swaps: a troca do aluno fica registrada para o especialista (0086, #365)
-- O especialista precisa saber que o treino de hoje não foi o que ele passou.
-- A linha é evidência: só a função grava, com o autor do JWT e a hora do
-- servidor; ninguém escreve, corrige nem apaga direto. Quem lê é o aluno e o
-- especialista com vínculo ativo, nunca outro especialista.

BEGIN;

DO $$
DECLARE
  aluno        uuid := gen_random_uuid();
  outro_aluno  uuid := gen_random_uuid();
  espec        uuid := gen_random_uuid();
  espec_alheio uuid := gen_random_uuid();
  remada       uuid;
  halteres     uuid;
  item         uuid;
  item_proprio uuid;
  visiveis     int;
  afetadas     int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (aluno, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-xa@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (outro_aluno, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-xb@elevapro.local', '{"full_name":"B","account_type":"member"}'::jsonb),
    (espec, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-xe@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb),
    (espec_alheio, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-xf@elevapro.local', '{"full_name":"F","account_type":"specialist"}'::jsonb);

  INSERT INTO auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
  VALUES (gen_random_uuid(), espec, 'totp', 'verified', now(), now()),
         (gen_random_uuid(), espec_alheio, 'totp', 'verified', now(), now());

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (aluno, espec, 'personal_training', 'active');

  INSERT INTO public.exercises (name) VALUES ('verify-x-remada') RETURNING id INTO remada;
  INSERT INTO public.exercises (name) VALUES ('verify-x-halteres') RETURNING id INTO halteres;

  -- O treino que o especialista prescreveu, dentro da periodização do aluno.
  WITH periodo AS (
    INSERT INTO public.training_periodizations (specialist_id, student_id, name, start_date, end_date)
    VALUES (espec, aluno, 'verify-x', current_date, current_date + 28) RETURNING id
  ), fase AS (
    INSERT INTO public.training_plans (periodization_id, name, start_date, end_date)
    SELECT id, 'verify-x', current_date, current_date + 28 FROM periodo RETURNING id
  ), treino AS (
    INSERT INTO public.workouts (title, specialist_id, training_plan_id)
    SELECT 'verify-x', espec, id FROM fase RETURNING id
  )
  INSERT INTO public.workout_exercises (workout_id, exercise_id)
  SELECT id, remada FROM treino RETURNING id INTO item;

  -- O plano do próprio Praticante, como o onboarding grava: periodização e
  -- fase sem especialista.
  WITH periodo AS (
    INSERT INTO public.training_periodizations (specialist_id, student_id, name, start_date, end_date)
    VALUES (NULL, outro_aluno, 'verify-x-proprio', current_date, current_date + 28) RETURNING id
  ), fase AS (
    INSERT INTO public.training_plans (periodization_id, name, start_date, end_date)
    SELECT id, 'verify-x-proprio', current_date, current_date + 28 FROM periodo RETURNING id
  ), treino AS (
    INSERT INTO public.workouts (title, specialist_id, student_id, training_plan_id)
    SELECT 'verify-x-proprio', NULL, outro_aluno, id FROM fase RETURNING id
  )
  INSERT INTO public.workout_exercises (workout_id, exercise_id)
  SELECT id, remada FROM treino RETURNING id INTO item_proprio;

  SET LOCAL ROLE authenticated;

  -- O aluno registra a troca do treino prescrito, e o banco tira o resto dele.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', aluno, 'role', 'authenticated')::text, true);
  PERFORM public.record_exercise_swap(item, halteres, 'today');

  BEGIN
    INSERT INTO public.exercise_swaps (student_id, workout_id, scope)
    SELECT aluno, workout_id, 'today' FROM public.workout_exercises WHERE id = item;
    RAISE EXCEPTION 'EVIDÊNCIA FORJADA: o aluno gravou troca direto, sem passar pela função';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.exercise_swaps WHERE student_id = aluno;
    GET DIAGNOSTICS afetadas = ROW_COUNT;
    IF afetadas <> 0 THEN
      RAISE EXCEPTION 'EVIDÊNCIA APAGADA: o aluno apagou a troca que o especialista precisa ver';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Outra pessoa não registra troca no treino deste aluno.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', outro_aluno, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.record_exercise_swap(item, halteres, 'today');
    RAISE EXCEPTION 'TROCA EM NOME DE OUTRO: alguém registrou troca no treino prescrito de outro aluno';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- O Praticante não tem especialista a avisar: a troca dele não vira registro.
  BEGIN
    PERFORM public.record_exercise_swap(item_proprio, halteres, 'today');
    RAISE EXCEPTION 'REGISTRO SEM DESTINATÁRIO: troca do Praticante gravada sem especialista para ler (Art. 6°, III)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- O especialista vinculado vê; o de fora, não.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visiveis FROM public.exercise_swaps WHERE student_id = aluno;
  IF visiveis <> 1 THEN
    RAISE EXCEPTION 'TROCA ESCONDIDA: o especialista vinculado vê % troca(s) do aluno, esperado 1', visiveis;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec_alheio, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visiveis FROM public.exercise_swaps WHERE student_id = aluno;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'TROCA VAZADA: especialista sem vínculo leu a troca do aluno';
  END IF;

  RAISE NOTICE 'ok  troca registrada: só pela função, vista pelo aluno e pelo especialista vinculado';
END $$;

ROLLBACK;

-- ── specialist_link_codes: o especialista também gera código (0087, #365) ────
-- Quem já tem conta não entra pelo convite por e-mail. O código do especialista
-- liga o aluno a ele; o código só vale para aluno, vence, e é usado uma vez.

BEGIN;

DO $$
DECLARE
  espec        uuid := gen_random_uuid();
  espec_alheio uuid := gen_random_uuid();
  praticante   uuid := gen_random_uuid();
  vinculos     int;
  visiveis     int;
  resposta     jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (espec, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ca@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb),
    (espec_alheio, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-cb@elevapro.local', '{"full_name":"F","account_type":"specialist"}'::jsonb),
    (praticante, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-cc@elevapro.local', '{"full_name":"P","account_type":"member"}'::jsonb);

  INSERT INTO auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
  VALUES (gen_random_uuid(), espec, 'totp', 'verified', now(), now()),
         (gen_random_uuid(), espec_alheio, 'totp', 'verified', now(), now());
  INSERT INTO public.specialist_services (specialist_id, service_type)
  VALUES (espec, 'personal_training');

  IF has_function_privilege('anon', 'public.link_to_specialist_by_code(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'VÍNCULO ANÔNIMO: anon pode executar link_to_specialist_by_code';
  END IF;

  SET LOCAL ROLE authenticated;

  -- O especialista gera o próprio código.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  INSERT INTO public.specialist_link_codes (specialist_id, code, expires_at)
  VALUES (espec, 'VERIFYX1', now() + interval '1 day'),
         (espec, 'VERIFYX0', now() - interval '1 minute');

  -- Outro especialista não lê o código nem o resgata.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', espec_alheio, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visiveis FROM public.specialist_link_codes WHERE specialist_id = espec;
  IF visiveis <> 0 THEN
    RAISE EXCEPTION 'CÓDIGO VAZADO: especialista leu o código de outro e pode se passar por ele';
  END IF;
  resposta := public.link_to_specialist_by_code('VERIFYX1');
  IF (resposta->>'success')::boolean THEN
    RAISE EXCEPTION 'ESPECIALISTA COMO ALUNO: um especialista resgatou o código de outro';
  END IF;

  -- O Praticante não gera código em nome de especialista.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', praticante, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.specialist_link_codes (specialist_id, code, expires_at)
    VALUES (praticante, 'VERIFYX2', now() + interval '1 day');
    RAISE EXCEPTION 'CÓDIGO FALSO: um aluno gerou código de especialista';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Código vencido não liga; o válido liga uma vez só.
  resposta := public.link_to_specialist_by_code('verifyx0');
  IF (resposta->>'success')::boolean THEN
    RAISE EXCEPTION 'CÓDIGO VENCIDO ACEITO: vínculo com código expirado';
  END IF;
  resposta := public.link_to_specialist_by_code(' verifyx1 ');
  IF NOT (resposta->>'success')::boolean THEN
    RAISE EXCEPTION 'o Praticante não se vincula pelo código válido do especialista: %', resposta;
  END IF;
  resposta := public.link_to_specialist_by_code('VERIFYX1');
  IF (resposta->>'success')::boolean THEN
    RAISE EXCEPTION 'CÓDIGO REUSADO: o mesmo código ligou duas vezes';
  END IF;

  RESET ROLE;
  SELECT count(*) INTO vinculos FROM public.student_specialists
  WHERE student_id = praticante AND specialist_id = espec AND status = 'active';
  IF vinculos <> 1 THEN
    RAISE EXCEPTION 'o vínculo pelo código do especialista não ficou ativo: % linha(s)', vinculos;
  END IF;

  RAISE NOTICE 'ok  código do especialista: só ele gera e lê, só aluno resgata, uma vez, antes de vencer';
END $$;

ROLLBACK;

-- ── weekly_check_ins e plan_adjustments: o check-in da semana (0097, #376) ─────
-- O Praticante diz como foi a semana e o peso; o ajuste da meta só vale
-- aprovado, no máximo 200 kcal, e fica registrado; o "Desfazer" do mesmo dia
-- volta a meta e registra o inverso. O Aluno faz o check-in sem peso e sem
-- ajuste: com especialista, quem mede e muda o plano é ele (ADR-0030). As duas
-- tabelas são de Art. 11: o especialista vinculado lê com consentimento, e
-- ninguém grava, corrige nem apaga direto.

BEGIN;

DO $$
DECLARE
  practitioner      uuid := gen_random_uuid();
  student           uuid := gen_random_uuid();
  no_consent        uuid := gen_random_uuid();
  specialist        uuid := gen_random_uuid();
  other_specialist  uuid := gen_random_uuid();
  rice              uuid;
  diet              uuid;
  meal              uuid;
  week_check_in     public.weekly_check_ins;
  student_check_in  public.weekly_check_ins;
  active_plan       public.diet_plans;
  visible           int;
  affected          int;
  grams             numeric;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (practitioner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ca@elevapro.local', '{"full_name":"P","account_type":"member"}'::jsonb),
    (student, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-cb@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (no_consent, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-cc@elevapro.local', '{"full_name":"S","account_type":"member"}'::jsonb),
    (specialist, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-ce@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb),
    (other_specialist, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-cf@elevapro.local', '{"full_name":"F","account_type":"specialist"}'::jsonb);

  INSERT INTO auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
  VALUES (gen_random_uuid(), specialist, 'totp', 'verified', now(), now()),
         (gen_random_uuid(), other_specialist, 'totp', 'verified', now(), now());

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (student, specialist, 'nutrition_consulting', 'active');
  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES (practitioner, 'health_data_collection', now(), '1.10'),
         (student, 'health_data_collection', now(), '1.10');
  -- Todos com altura e o Aluno com dieta própria: cada recusa abaixo tem de
  -- vir da regra que ela testa, não de um dado que faltou.
  INSERT INTO public.student_anamnesis (student_id, responses)
  VALUES (practitioner, '{"height":"172"}'::jsonb),
         (student, '{"height":"180"}'::jsonb),
         (no_consent, '{"height":"165"}'::jsonb);

  -- A dieta do próprio Praticante, como o onboarding grava.
  INSERT INTO public.foods (name) VALUES ('verify-c-arroz') RETURNING id INTO rice;
  INSERT INTO public.diet_plans (student_id, specialist_id, name, plan_type, status, version,
                                 start_date, end_date, target_calories, target_carbs)
  VALUES (practitioner, NULL, 'verify-c', 'unique', 'active', 1, current_date, current_date + 28, 2150, 250)
  RETURNING id INTO diet;
  INSERT INTO public.diet_plans (student_id, specialist_id, name, plan_type, status, version,
                                 start_date, end_date, target_calories, target_carbs)
  VALUES (student, NULL, 'verify-c-aluno', 'unique', 'active', 1, current_date, current_date + 28, 2000, 230);
  INSERT INTO public.diet_meals (diet_plan_id, name) VALUES (diet, 'Almoço') RETURNING id INTO meal;
  INSERT INTO public.diet_meal_items (diet_meal_id, food_id, quantity, unit)
  VALUES (meal, rice, 200, 'g');

  SET LOCAL ROLE authenticated;

  -- O Praticante faz o check-in; o peso vira medida declarada.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', practitioner, 'role', 'authenticated')::text, true);
  week_check_in := public.submit_weekly_check_in('all', 77.6);
  IF week_check_in.assessment_id IS NULL THEN
    RAISE EXCEPTION 'PESO PERDIDO: o check-in do Praticante não apontou para a medida declarada';
  END IF;

  -- A origem do peso (0102, F9): digitado por padrão, a média do app Saúde
  -- quando veio de lá, e nada além dessas duas.
  IF week_check_in.weight_origin IS DISTINCT FROM 'manual' THEN
    RAISE EXCEPTION 'ORIGEM PERDIDA: peso digitado gravou origem %', week_check_in.weight_origin;
  END IF;
  week_check_in := public.submit_weekly_check_in('all', 77.6, 'health_app');
  IF week_check_in.weight_origin IS DISTINCT FROM 'health_app' THEN
    RAISE EXCEPTION 'ORIGEM TROCADA: o peso do app Saúde foi gravado como %', week_check_in.weight_origin;
  END IF;
  BEGIN
    PERFORM public.submit_weekly_check_in('all', 77.6, 'balanca-do-vizinho');
    RAISE EXCEPTION 'ORIGEM INVENTADA: o check-in aceitou uma origem fora de manual e health_app';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  BEGIN
    INSERT INTO public.weekly_check_ins (student_id, week_start, logging)
    VALUES (practitioner, current_date - 7, 'all');
    RAISE EXCEPTION 'EVIDÊNCIA FORJADA: o aluno gravou check-in direto, sem passar pela função';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Passo maior que 200 kcal, ou motivo que contradiz o número: recusados.
  BEGIN
    PERFORM public.apply_weekly_calorie_adjustment(week_check_in.id, 1850, 'weight_above_pace');
    RAISE EXCEPTION 'META SEM FREIO: ajuste de 300 kcal numa semana foi aceito';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.apply_weekly_calorie_adjustment(week_check_in.id, 2300, 'weight_above_pace');
    RAISE EXCEPTION 'MOTIVO TROCADO: peso acima do ritmo subiu a meta';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  -- Outra pessoa não decide o check-in do Praticante.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', no_consent, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.keep_weekly_target(week_check_in.id);
    RAISE EXCEPTION 'DECISÃO EM NOME DE OUTRO: alguém manteve a meta do check-in alheio';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Sem o aceite de saúde, não há check-in (Art. 11, I).
  BEGIN
    PERFORM public.submit_weekly_check_in('all', 70);
    RAISE EXCEPTION 'CHECK-IN SEM CONSENTIMENTO: dado de saúde gravado sem o aceite vigente';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- O Praticante aprova: dieta nova, porções refeitas, ajuste registrado.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', practitioner, 'role', 'authenticated')::text, true);
  active_plan := public.apply_weekly_calorie_adjustment(week_check_in.id, 2000, 'weight_above_pace');
  IF active_plan.id = diet OR active_plan.target_calories <> 2000 OR active_plan.status <> 'active' THEN
    RAISE EXCEPTION 'AJUSTE SEM VERSÃO: a meta aprovada não virou a versão ativa da dieta';
  END IF;
  SELECT i.quantity INTO grams FROM public.diet_meal_items i
    JOIN public.diet_meals m ON m.id = i.diet_meal_id WHERE m.diet_plan_id = active_plan.id;
  IF grams <> 185 THEN
    RAISE EXCEPTION 'CARDÁPIO NA META ANTIGA: 200 g × 2000/2150 deveria virar 185 g, virou %', grams;
  END IF;
  SELECT count(*) INTO visible FROM public.plan_adjustments
    WHERE student_id = practitioner AND before_value = 2150 AND after_value = 2000;
  IF visible <> 1 THEN
    RAISE EXCEPTION 'AJUSTE SEM REGISTRO: a mudança da meta não ficou no histórico';
  END IF;

  BEGIN
    UPDATE public.plan_adjustments SET after_value = 2500 WHERE student_id = practitioner;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN
      RAISE EXCEPTION 'HISTÓRICO REESCRITO: o aluno alterou um ajuste já aprovado';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Outra pessoa não desfaz o ajuste do Praticante.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', no_consent, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.undo_weekly_calorie_adjustment(week_check_in.id);
    RAISE EXCEPTION 'DESFEITO EM NOME DE OUTRO: alguém desfez o ajuste alheio';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- O Praticante desfaz no mesmo dia: a meta volta, e o histórico guarda os dois.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', practitioner, 'role', 'authenticated')::text, true);
  active_plan := public.undo_weekly_calorie_adjustment(week_check_in.id);
  IF active_plan.target_calories <> 2150 THEN
    RAISE EXCEPTION 'DESFAZER SEM EFEITO: a meta ficou em % em vez de voltar a 2150', active_plan.target_calories;
  END IF;
  SELECT count(*) INTO visible FROM public.plan_adjustments WHERE student_id = practitioner;
  IF visible <> 2 THEN
    RAISE EXCEPTION 'HISTÓRICO APAGADO: desfazer deixou % ajuste(s), esperado o original e o inverso', visible;
  END IF;
  BEGIN
    PERFORM public.undo_weekly_calorie_adjustment(week_check_in.id);
    RAISE EXCEPTION 'DESFEITO DUAS VEZES: o mesmo ajuste foi desfeito de novo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- O Aluno faz o check-in sem peso; peso e ajuste são do especialista.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.submit_weekly_check_in('all', 80);
    RAISE EXCEPTION 'PESO AO LADO DA FITA: aluno com especialista declarou peso no check-in (ADR-0030)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  student_check_in := public.submit_weekly_check_in('partial', NULL);
  BEGIN
    PERFORM public.apply_weekly_calorie_adjustment(student_check_in.id, 1900, 'weight_above_pace');
    RAISE EXCEPTION 'AJUSTE SEM O ESPECIALISTA: aluno acompanhado mudou a própria meta';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- O especialista vinculado vê o check-in; o de fora, não; revogado, ninguém.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visible FROM public.weekly_check_ins WHERE student_id = student;
  IF visible <> 1 THEN
    RAISE EXCEPTION 'CHECK-IN ESCONDIDO: o especialista vinculado vê % check-in(s) do aluno, esperado 1', visible;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', other_specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visible FROM public.weekly_check_ins WHERE student_id IN (student, practitioner);
  IF visible <> 0 THEN
    RAISE EXCEPTION 'CHECK-IN VAZADO: especialista sem vínculo leu o check-in de outro aluno';
  END IF;
  SELECT count(*) INTO visible FROM public.plan_adjustments WHERE student_id = practitioner;
  IF visible <> 0 THEN
    RAISE EXCEPTION 'AJUSTE VAZADO: especialista sem vínculo leu a meta de outro aluno';
  END IF;

  RESET ROLE;
  UPDATE public.student_consents SET revoked_at = now() WHERE student_id = student;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visible FROM public.weekly_check_ins WHERE student_id = student;
  IF visible <> 0 THEN
    RAISE EXCEPTION 'REVOGAÇÃO SEM EFEITO: o especialista segue lendo o check-in de quem revogou';
  END IF;

  RAISE NOTICE 'ok  check-in da semana: só pelas funções, ajuste com freio, registro e desfazer, Aluno sem peso nem ajuste';
END $$;

ROLLBACK;

-- ── workout_session_exercises.effort: o esforço do exercício (0098, #376) ──────
-- "Fácil", "Ok" ou "Difícil" e nada mais: o valor é a entrada de uma regra em
-- código, e texto livre aqui viraria um campo de anotação sem a base legal das
-- anotações (Art. 11), que é outra.

BEGIN;

DO $$
DECLARE
  student uuid := gen_random_uuid();
  session uuid;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES (student, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'verify-ea@elevapro.local', '{"full_name":"P","account_type":"member"}'::jsonb);
  INSERT INTO public.workout_sessions (student_id, started_at) VALUES (student, now())
    RETURNING id INTO session;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);

  INSERT INTO public.workout_session_exercises (session_id, effort) VALUES (session, 'hard');
  BEGIN
    INSERT INTO public.workout_session_exercises (session_id, effort) VALUES (session, 'cansei, joelho doeu');
    RAISE EXCEPTION 'ESFORÇO VIROU ANOTAÇÃO: o banco aceitou texto livre no esforço do exercício';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'ok  esforço do exercício: só easy, ok ou hard';
END $$;

ROLLBACK;

-- ── end_reason: o motivo do fim do plano (0099, #376) ──────────────────────────
-- O motivo é uma lista fechada, gravada pelo BFF: texto livre aqui viraria lugar
-- de anotar lesão sem a base legal de dado de saúde (Art. 11), e o Praticante
-- não reescreve por que o próprio bloco acabou (histórico, Art. 6°, V).

BEGIN;

DO $$
DECLARE
  student uuid := gen_random_uuid();
  block uuid;
  changed int;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES (student, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'verify-er@elevapro.local', '{"full_name":"P","account_type":"member"}'::jsonb);
  INSERT INTO public.training_periodizations
    (student_id, specialist_id, name, status, start_date, end_date, end_reason)
  VALUES (student, NULL, 'Bloco 1', 'completed', CURRENT_DATE - 28, CURRENT_DATE, 'block_completed')
  RETURNING id INTO block;

  BEGIN
    UPDATE public.training_periodizations SET end_reason = 'machuquei o joelho' WHERE id = block;
    RAISE EXCEPTION 'MOTIVO VIROU ANOTAÇÃO: o banco aceitou texto livre no motivo do fim do plano';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);

  UPDATE public.training_periodizations SET end_reason = 'replaced' WHERE id = block;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'HISTÓRICO REESCRITO: o aluno mudou o motivo do fim do próprio bloco';
  END IF;

  RAISE NOTICE 'ok  motivo do fim do plano: lista fechada, e o aluno não reescreve';
END $$;

ROLLBACK;

-- ── rest_periods: o Modo Descanso (0101, #376) ─────────────────────────────────
-- A pausa guarda só de quando a quando: o motivo ("doente", "machucada") é dado
-- de saúde que a pausa não precisa, e não tem onde ser gravado. Só pelas
-- funções, uma aberta por vez, e o especialista sem vínculo não lê.

BEGIN;

DO $$
DECLARE
  student           uuid := gen_random_uuid();
  specialist        uuid := gen_random_uuid();
  other_specialist  uuid := gen_random_uuid();
  rest              public.rest_periods;
  visible           int;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'rest_periods'
               AND column_name NOT IN ('id', 'student_id', 'starts_on', 'planned_until', 'ended_on', 'created_at')) THEN
    RAISE EXCEPTION 'PAUSA COM MOTIVO: rest_periods ganhou coluna além das datas — o motivo é dado de saúde';
  END IF;

  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (student, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-da@elevapro.local', '{"full_name":"A","account_type":"student"}'::jsonb),
    (specialist, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-de@elevapro.local', '{"full_name":"E","account_type":"specialist"}'::jsonb),
    (other_specialist, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-df@elevapro.local', '{"full_name":"F","account_type":"specialist"}'::jsonb);
  INSERT INTO auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
  VALUES (gen_random_uuid(), specialist, 'totp', 'verified', now(), now()),
         (gen_random_uuid(), other_specialist, 'totp', 'verified', now(), now());
  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (student, specialist, 'personal_training', 'active');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);

  rest := public.start_rest(current_date + 7);
  BEGIN
    PERFORM public.start_rest(NULL);
    RAISE EXCEPTION 'PAUSA DUPLICADA: duas pausas abertas ao mesmo tempo';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rest_periods (student_id, starts_on) VALUES (student, current_date);
    RAISE EXCEPTION 'GRAVAÇÃO DIRETA: o cliente inseriu pausa sem passar pela função';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visible FROM public.rest_periods WHERE student_id = student;
  IF visible <> 1 THEN
    RAISE EXCEPTION 'ESPECIALISTA CEGO: o vinculado não vê que o aluno está pausado';
  END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', other_specialist, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SELECT count(*) INTO visible FROM public.rest_periods WHERE student_id = student;
  IF visible <> 0 THEN
    RAISE EXCEPTION 'PAUSA VAZADA: especialista sem vínculo leu a pausa de outro aluno';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  rest := public.end_rest();
  IF rest.ended_on IS NULL THEN
    RAISE EXCEPTION 'VOLTA PERDIDA: encerrar a pausa não gravou o dia da volta';
  END IF;

  RAISE NOTICE 'ok  Modo Descanso: só as datas, só pelas funções, uma aberta, sem vazamento';
END $$;

ROLLBACK;

-- ── plan_adjustments: o plano mais simples (0103, #376 A5c) ────────────────────
-- Com aderência baixa, a meta não muda: o plano perde uma refeição. O registro
-- é da própria pessoa, sobre o próprio check-in pendente e a própria dieta
-- ativa, uma refeição a menos de cada vez, e só pela função.

BEGIN;

DO $$
DECLARE
  practitioner  uuid := gen_random_uuid();
  intruder      uuid := gen_random_uuid();
  diet          uuid;
  other_diet    uuid;
  check_in      public.weekly_check_ins;
  adjustment    public.plan_adjustments;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  VALUES
    (practitioner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-sa@elevapro.local', '{"full_name":"P","account_type":"member"}'::jsonb),
    (intruder, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'verify-sb@elevapro.local', '{"full_name":"I","account_type":"member"}'::jsonb);
  INSERT INTO public.student_consents (student_id, consent_type, given_at, policy_version)
  VALUES (practitioner, 'health_data_collection', now(), '1.10'),
         (intruder, 'health_data_collection', now(), '1.10');
  INSERT INTO public.student_anamnesis (student_id, responses)
  VALUES (practitioner, '{"height":"172"}'::jsonb);
  INSERT INTO public.diet_plans (student_id, specialist_id, name, plan_type, status, version,
                                 start_date, end_date, target_calories)
  VALUES (practitioner, NULL, 'verify-s', 'unique', 'active', 1, current_date - 14, current_date + 14, 2150)
  RETURNING id INTO diet;
  INSERT INTO public.diet_plans (student_id, specialist_id, name, plan_type, status, version,
                                 start_date, end_date, target_calories)
  VALUES (intruder, NULL, 'verify-s-outro', 'unique', 'active', 1, current_date, current_date + 28, 2000)
  RETURNING id INTO other_diet;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', practitioner, 'role', 'authenticated')::text, true);
  check_in := public.submit_weekly_check_in('all', NULL);

  -- Outra pessoa não simplifica o plano de ninguém.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.record_plan_simplification(check_in.id, diet, 5, 4);
    RAISE EXCEPTION 'SIMPLIFICAÇÃO ALHEIA: alguém registrou o ajuste do check-in de outra pessoa';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', practitioner, 'role', 'authenticated')::text, true);
  -- Uma refeição a menos de cada vez, e nunca abaixo de três.
  BEGIN
    PERFORM public.record_plan_simplification(check_in.id, diet, 5, 3);
    RAISE EXCEPTION 'PLANO CORTADO DEMAIS: a simplificação tirou duas refeições de uma vez';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.record_plan_simplification(check_in.id, diet, 3, 2);
    RAISE EXCEPTION 'PLANO SEM REFEIÇÃO: a simplificação foi abaixo de três refeições';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  -- A dieta é a própria: a de outra pessoa não vira a "nova" de ninguém.
  BEGIN
    PERFORM public.record_plan_simplification(check_in.id, other_diet, 5, 4);
    RAISE EXCEPTION 'DIETA ALHEIA: o ajuste apontou para a dieta de outra pessoa';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.plan_adjustments (student_id, kind, before_value, after_value, reason, source)
    VALUES (practitioner, 'plan_simplified', 5, 4, 'low_adherence', 'student');
    RAISE EXCEPTION 'EVIDÊNCIA FORJADA: o aluno gravou ajuste direto, sem passar pela função';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  adjustment := public.record_plan_simplification(check_in.id, diet, 5, 4);
  IF adjustment.kind <> 'plan_simplified' OR adjustment.reason <> 'low_adherence' THEN
    RAISE EXCEPTION 'AJUSTE TROCADO: a simplificação foi gravada como % (%)', adjustment.kind, adjustment.reason;
  END IF;
  IF (SELECT status FROM public.weekly_check_ins WHERE id = check_in.id) <> 'approved' THEN
    RAISE EXCEPTION 'CHECK-IN ABERTO: a simplificação aprovada não fechou o check-in';
  END IF;

  RAISE NOTICE 'ok  plano mais simples: só pela função, da própria pessoa, uma refeição a menos';
END $$;

ROLLBACK;
