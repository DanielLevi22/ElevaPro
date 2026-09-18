-- Auditoria de mudanças que concedem, restringem ou removem acesso de conta
-- (issue #322). Papel e status são definidos por RPC, painel administrativo ou
-- serviço interno; a trilha fica no banco para cobrir todos esses caminhos.

CREATE OR REPLACE FUNCTION private.audit_profile_authorization_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_actor_id uuid := (SELECT auth.uid());
BEGIN
  IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
    INSERT INTO private.security_audit_events (
      occurred_at, event_type, outcome, actor_id, subject_id,
      resource_type, resource_id, origin, expires_at
    ) VALUES (
      v_now, 'authorization.account_role.set_' || NEW.account_type::text,
      'succeeded', v_actor_id, NEW.id,
      'account', NEW.id::text, 'database', v_now + interval '365 days'
    );
  END IF;

  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    INSERT INTO private.security_audit_events (
      occurred_at, event_type, outcome, actor_id, subject_id,
      resource_type, resource_id, origin, expires_at
    ) VALUES (
      v_now, 'authorization.account_status.set_' || NEW.account_status::text,
      'succeeded', v_actor_id, NEW.id,
      'account', NEW.id::text, 'database', v_now + interval '365 days'
    );
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.audit_profile_authorization_change()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE TRIGGER profiles_audit_authorization_change
  AFTER UPDATE OF account_type, account_status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.audit_profile_authorization_change();
--> statement-breakpoint

COMMENT ON FUNCTION private.audit_profile_authorization_change() IS
  'Registra somente a mudança de autorização e IDs opacos de conta; nunca nome, e-mail, token ou conteúdo.';
