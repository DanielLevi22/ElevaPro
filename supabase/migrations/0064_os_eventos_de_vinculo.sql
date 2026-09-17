-- Auditoria do vínculo que governa o acesso Specialist–Student (issue #322).
-- O vínculo pode mudar pelo app, RPC ou BFF. A evidência nasce nesta mesma
-- transação para que nenhum desses caminhos dependa de uma chamada opcional.

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
    -- Uma alteração de status que não cria nem revoga acesso não é evento
    -- relevante. Evita ampliar a trilha com ruído sem valor investigativo.
    RETURN NEW;
  END IF;

  -- auth.uid() é a identidade confiável dos caminhos sob RLS. O BFF usa a
  -- service_role sem sessão; nesses casos ended_by (revogação) e specialist_id
  -- (concessão) são valores determinados pelo servidor, não pelo cliente.
  v_actor_id := COALESCE(
    (SELECT auth.uid()),
    CASE WHEN NEW.status = 'inactive' THEN NEW.ended_by ELSE NEW.specialist_id END
  );

  INSERT INTO private.security_audit_events (
    occurred_at, event_type, outcome, actor_id, subject_id,
    resource_type, resource_id, origin, expires_at
  ) VALUES (
    v_now, v_event_type, 'succeeded', v_actor_id, NEW.student_id,
    'specialist_student_link', NEW.id::text, 'database', v_now + interval '365 days'
  );

  RETURN NEW;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.audit_student_specialist_link_change()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE TRIGGER student_specialists_audit_change
  AFTER INSERT OR UPDATE OF status ON public.student_specialists
  FOR EACH ROW EXECUTE FUNCTION private.audit_student_specialist_link_change();
--> statement-breakpoint

COMMENT ON FUNCTION private.audit_student_specialist_link_change() IS
  'Registra concessão ou revogação de vínculo por IDs opacos; nunca inclui dado de saúde ou conteúdo.';
