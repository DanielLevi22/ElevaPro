-- O UUID do vínculo é identificador correlacionável e não pertence à trilha.
-- A 0070 corrigiu recursos que eram o próprio titular, mas deixou esta classe
-- de evento fora da conversão. A mesma chave do Vault preserva investigação
-- sem reintroduzir o identificador em claro.

CREATE OR REPLACE FUNCTION private.audit_student_specialist_link_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_event_type text;
  v_actor_id uuid;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    v_event_type := 'authorization.specialist_student_link.granted';
  ELSIF OLD.status = 'active' AND NEW.status = 'inactive' THEN
    v_event_type := 'authorization.specialist_student_link.revoked';
  ELSE
    RETURN NEW;
  END IF;

  v_actor_id := COALESCE(
    (SELECT auth.uid()),
    CASE WHEN NEW.status = 'inactive' THEN NEW.ended_by ELSE NEW.specialist_id END
  );

  INSERT INTO private.security_audit_events (
    occurred_at, event_type, outcome, actor_hash, subject_hash,
    resource_type, resource_id, origin, expires_at
  ) VALUES (
    v_now, v_event_type, 'succeeded', private.audit_principal_hash(v_actor_id),
    private.audit_principal_hash(NEW.student_id), 'specialist_student_link',
    private.audit_principal_hash(NEW.id), 'database', v_now + interval '365 days'
  );

  RETURN NEW;
END;
$$;
--> statement-breakpoint

UPDATE private.security_audit_events
   SET resource_id = private.audit_principal_hash(resource_id::uuid)
 WHERE resource_type = 'specialist_student_link'
   AND resource_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
