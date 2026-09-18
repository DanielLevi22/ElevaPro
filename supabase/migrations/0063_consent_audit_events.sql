-- Auditoria de concessão e revogação de consentimento (issue #322).
-- O app grava consentimento direto sob RLS; por isso a evidência nasce no banco,
-- no mesmo commit da mutação, e não em uma chamada opcional do cliente.

CREATE OR REPLACE FUNCTION private.audit_student_consent_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_event_type text;
  v_subject_id uuid;
  v_consent_type text;
  v_policy_version text;
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NULL) THEN
    v_event_type := 'privacy.consent.granted';
    v_subject_id := NEW.student_id;
    v_consent_type := NEW.consent_type::text;
    v_policy_version := NEW.policy_version;
  ELSIF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    v_event_type := 'privacy.consent.revoked';
    v_subject_id := NEW.student_id;
    v_consent_type := NEW.consent_type::text;
    v_policy_version := NEW.policy_version;
  ELSE
    v_event_type := 'privacy.consent.updated';
    v_subject_id := NEW.student_id;
    v_consent_type := NEW.consent_type::text;
    v_policy_version := NEW.policy_version;
  END IF;

  INSERT INTO private.security_audit_events (
    occurred_at, event_type, outcome, actor_hash, subject_hash,
    resource_type, resource_id, origin, expires_at
  ) VALUES (
    v_now, v_event_type, 'succeeded', private.audit_principal_hash((SELECT auth.uid())), private.audit_principal_hash(v_subject_id),
    'consent', v_consent_type || ':' || v_policy_version, 'database', v_now + interval '365 days'
  );

  RETURN NEW;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.audit_student_consent_change()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE TRIGGER student_consents_audit_change
  AFTER INSERT OR UPDATE ON public.student_consents
  FOR EACH ROW EXECUTE FUNCTION private.audit_student_consent_change();
--> statement-breakpoint

COMMENT ON FUNCTION private.audit_student_consent_change() IS
  'Registra somente evento, titular, finalidade e versão de consentimento; nunca conteúdo ou dado de saúde.';
