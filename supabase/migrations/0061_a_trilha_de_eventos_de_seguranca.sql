-- Trilha mínima, privada e append-only de segurança e privacidade (issue #322).
-- Não é log de aplicação: não aceita corpo, cabeçalho, conteúdo, nome, e-mail,
-- token, senha ou valor de saúde. A leitura ainda não é exposta a usuários; uma
-- tela de auditoria precisará de autorização específica em issue própria.

CREATE TABLE private.security_audit_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  outcome text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  origin text NOT NULL,
  trace_id text,
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT security_audit_events_event_type_format
    CHECK (event_type ~ '^[a-z][a-z0-9._-]{2,79}$'),
  CONSTRAINT security_audit_events_outcome_valid
    CHECK (outcome IN ('succeeded', 'failed', 'denied')),
  CONSTRAINT security_audit_events_resource_type_format
    CHECK (resource_type ~ '^[a-z][a-z0-9._-]{1,63}$'),
  CONSTRAINT security_audit_events_resource_id_length
    CHECK (char_length(resource_id) BETWEEN 1 AND 128),
  CONSTRAINT security_audit_events_origin_valid
    CHECK (origin IN ('bff', 'database', 'job')),
  CONSTRAINT security_audit_events_trace_id_format
    CHECK (trace_id IS NULL OR trace_id ~ '^[0-9a-f]{32}$'),
  CONSTRAINT security_audit_events_expiry_after_occurrence CHECK (expires_at > occurred_at)
);
--> statement-breakpoint

CREATE INDEX security_audit_events_occurred_at_idx
  ON private.security_audit_events (occurred_at);
CREATE INDEX security_audit_events_actor_id_idx
  ON private.security_audit_events (actor_id);
CREATE INDEX security_audit_events_subject_id_idx
  ON private.security_audit_events (subject_id);
CREATE INDEX security_audit_events_expires_at_idx
  ON private.security_audit_events (expires_at);
--> statement-breakpoint

ALTER TABLE private.security_audit_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY security_audit_events_no_client_access
  ON private.security_audit_events FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
--> statement-breakpoint

-- Nem mesmo service_role recebe DML na tabela. Ele só executa a função abaixo,
-- cuja assinatura não tem campo livre de payload e cuja escrita é só INSERT.
REVOKE ALL ON TABLE private.security_audit_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE private.security_audit_events_event_id_seq FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.record_security_audit_event(
  p_event_type text,
  p_outcome text,
  p_actor_id uuid,
  p_subject_id uuid,
  p_resource_type text,
  p_resource_id text,
  p_origin text,
  p_trace_id text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
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
  IF char_length(p_resource_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'resource_id must have 1 to 128 characters; received %', char_length(p_resource_id);
  END IF;
  IF p_origin NOT IN ('bff', 'database', 'job') THEN
    RAISE EXCEPTION 'origin must be bff, database or job; received %', p_origin;
  END IF;
  IF p_trace_id IS NOT NULL AND p_trace_id !~ '^[0-9a-f]{32}$' THEN
    RAISE EXCEPTION 'trace_id must be a 32 character lowercase hexadecimal identifier';
  END IF;

  -- Retenção de 365 dias: a remoção é idempotente e acontece em toda escrita.
  -- Um scheduler operacional independente ainda será exigido antes do lançamento
  -- para garantir a remoção mesmo em períodos sem eventos.
  DELETE FROM private.security_audit_events WHERE expires_at <= v_now;

  INSERT INTO private.security_audit_events (
    occurred_at, event_type, outcome, actor_id, subject_id,
    resource_type, resource_id, origin, trace_id, expires_at
  ) VALUES (
    v_now, p_event_type, p_outcome, p_actor_id, p_subject_id,
    p_resource_type, p_resource_id, p_origin, p_trace_id, v_now + interval '365 days'
  ) RETURNING event_id INTO v_event_id;

  RETURN v_event_id;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.record_security_audit_event(text, text, uuid, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_security_audit_event(text, text, uuid, uuid, text, text, text, text)
  TO service_role;
--> statement-breakpoint

COMMENT ON TABLE private.security_audit_events IS
  'Trilha append-only de eventos mínimos de segurança. Sem conteúdo ou dado de saúde; retenção alvo de 365 dias.';
