-- Pseudônimo com chave na trilha de auditoria (issue #322).
-- SHA-256 puro de um UUID se desfaz com qualquer UUID em mãos, e UUIDs aparecem
-- em URL (/students/[id]). E a 0065 e o BFF ainda gravavam o UUID em claro no
-- resource_id, ao lado do próprio hash. Agora o pseudônimo é HMAC com uma chave
-- que nasce no Vault e nunca sai do banco, e o resource_id de recurso que é o
-- próprio titular passa a ser o pseudônimo dele.

-- A chave é gerada aqui para não depender de passo manual por ambiente. Quem
-- restaurar o banco em outro projeto precisa levar este segredo junto, ou os
-- eventos novos deixam de correlacionar com os antigos.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'audit_pseudonym_key') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'audit_pseudonym_key',
      'Chave HMAC dos pseudônimos de private.security_audit_events. Não exportar.'
    );
  END IF;
END;
$$;
--> statement-breakpoint

-- Deixa de ser IMMUTABLE: o resultado depende do segredo. Continua sem EXECUTE
-- para papéis da aplicação; só as funções SECURITY DEFINER da trilha a chamam.
CREATE OR REPLACE FUNCTION private.audit_principal_hash(p_principal_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
STRICT
SET search_path = ''
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
   WHERE name = 'audit_pseudonym_key';

  -- Falha fechada: gravar sem pseudônimo seria gravar evidência sem ator.
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'vault secret audit_pseudonym_key is missing; expected a 64 character hex key created by migration 0070';
  END IF;

  RETURN encode(extensions.hmac(p_principal_id::text, v_key, 'sha256'), 'hex');
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.audit_principal_hash(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.audit_profile_authorization_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_actor_hash text := private.audit_principal_hash((SELECT auth.uid()));
  v_account_hash text := private.audit_principal_hash(NEW.id);
BEGIN
  IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
    INSERT INTO private.security_audit_events (
      occurred_at, event_type, outcome, actor_hash, subject_hash,
      resource_type, resource_id, origin, expires_at
    ) VALUES (
      v_now, 'authorization.account_role.set_' || NEW.account_type::text,
      'succeeded', v_actor_hash, v_account_hash,
      'account', v_account_hash, 'database', v_now + interval '365 days'
    );
  END IF;

  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    INSERT INTO private.security_audit_events (
      occurred_at, event_type, outcome, actor_hash, subject_hash,
      resource_type, resource_id, origin, expires_at
    ) VALUES (
      v_now, 'authorization.account_status.set_' || NEW.account_status::text,
      'succeeded', v_actor_hash, v_account_hash,
      'account', v_account_hash, 'database', v_now + interval '365 days'
    );
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

-- A assinatura muda: o BFF passa o UUID e o banco aplica a chave, para existir
-- uma chave só. Ator, titular e recurso ganham default porque nem todo evento
-- tem os três (rate limit anônimo não tem ator).
DROP FUNCTION public.record_security_audit_event(text, text, text, text, text, text, text, text);
--> statement-breakpoint

CREATE FUNCTION public.record_security_audit_event(
  p_event_type text,
  p_outcome text,
  p_resource_type text,
  p_origin text,
  p_actor_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_trace_id text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_subject_hash text := private.audit_principal_hash(p_subject_id);
  v_resource_id text := COALESCE(p_resource_id, v_subject_hash);
  v_event_id bigint;
BEGIN
  IF p_event_type !~ '^[a-z][a-z0-9._-]{2,79}$' THEN
    RAISE EXCEPTION 'event_type must be lowercase dotted identifier; received %', p_event_type;
  END IF;
  IF p_outcome NOT IN ('succeeded', 'failed', 'denied') THEN
    RAISE EXCEPTION 'outcome must be succeeded, failed or denied; received %', p_outcome;
  END IF;
  IF p_resource_type !~ '^[a-z][a-z0-9._-]{1,63}$' THEN
    RAISE EXCEPTION 'resource_type must be lowercase dotted identifier; received %', p_resource_type;
  END IF;
  IF v_resource_id IS NULL THEN
    RAISE EXCEPTION 'resource_id is required when there is no subject; received neither for %', p_event_type;
  END IF;
  -- UUID em claro desfaria o pseudônimo do titular gravado na mesma linha.
  IF v_resource_id ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    RAISE EXCEPTION 'resource_id must be opaque, not a UUID; pass the principal as p_subject_id (event %)', p_event_type;
  END IF;
  IF char_length(v_resource_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'resource_id must have 1 to 128 characters; received %', char_length(v_resource_id);
  END IF;
  IF p_origin NOT IN ('bff', 'database', 'job') THEN
    RAISE EXCEPTION 'origin must be bff, database or job; received %', p_origin;
  END IF;
  IF p_trace_id IS NOT NULL AND p_trace_id !~ '^[0-9a-f]{32}$' THEN
    RAISE EXCEPTION 'trace_id must be a 32 character lowercase hexadecimal identifier';
  END IF;

  DELETE FROM private.security_audit_events WHERE expires_at <= v_now;

  INSERT INTO private.security_audit_events (
    occurred_at, event_type, outcome, actor_hash, subject_hash,
    resource_type, resource_id, origin, trace_id, expires_at
  ) VALUES (
    v_now, p_event_type, p_outcome, private.audit_principal_hash(p_actor_id), v_subject_hash,
    p_resource_type, v_resource_id, p_origin, p_trace_id, v_now + interval '365 days'
  ) RETURNING event_id INTO v_event_id;

  RETURN v_event_id;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.record_security_audit_event(text, text, text, text, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_security_audit_event(text, text, text, text, uuid, uuid, text, text)
  TO service_role;
--> statement-breakpoint

-- Linhas gravadas antes desta migration: o hash antigo só é revertido para
-- quem ainda tem conta; o ator ou titular que não existe mais fica NULL, o que
-- é a desidentificação que a conta apagada deve produzir. O UUID em claro do
-- resource_id vira o pseudônimo do mesmo principal.
WITH principals AS (
  SELECT encode(extensions.digest(id::text, 'sha256'), 'hex') AS legacy_hash,
         private.audit_principal_hash(id) AS pseudonym
    FROM auth.users
)
UPDATE private.security_audit_events AS e
   SET actor_hash = (SELECT p.pseudonym FROM principals p WHERE p.legacy_hash = e.actor_hash),
       subject_hash = (SELECT p.pseudonym FROM principals p WHERE p.legacy_hash = e.subject_hash),
       resource_id = CASE
         WHEN e.resource_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           AND e.resource_type <> 'specialist_student_link'
         THEN private.audit_principal_hash(e.resource_id::uuid)
         ELSE e.resource_id
       END;
