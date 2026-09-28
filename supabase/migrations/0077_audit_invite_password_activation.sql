-- O BFF não vê a troca de senha feita diretamente no Supabase Auth. A trilha
-- nasce somente quando o Auth atualiza o hash de uma conta ainda convidada.
CREATE OR REPLACE FUNCTION private.audit_invite_password_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_subject_hash text;
BEGIN
  IF OLD.encrypted_password IS NOT DISTINCT FROM NEW.encrypted_password THEN
    RETURN NEW;
  END IF;

  PERFORM 1 FROM public.profiles
   WHERE id = NEW.id AND account_status = 'invited'
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_subject_hash := private.audit_principal_hash(NEW.id);
  UPDATE public.profiles SET account_status = 'active' WHERE id = NEW.id;

  INSERT INTO private.security_audit_events (
    occurred_at, event_type, outcome, actor_hash, subject_hash,
    resource_type, resource_id, origin, expires_at
  ) VALUES (
    v_now, 'identity.invite.accepted', 'succeeded', v_subject_hash, v_subject_hash,
    'account', v_subject_hash, 'database', v_now + interval '365 days'
  );

  RETURN NEW;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.audit_invite_password_activation()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE TRIGGER auth_user_invite_password_activation
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.audit_invite_password_activation();
--> statement-breakpoint

COMMENT ON FUNCTION private.audit_invite_password_activation() IS
  'Ativa convite e registra evento mínimo quando Auth grava senha nova; não registra senha, token ou dados pessoais em claro.';
--> statement-breakpoint

-- Durante o deploy, o BFF antigo ainda pode chamar a RPC depois da migration.
-- Recusar essa origem evita o evento falso também nessa janela de publicação.
CREATE OR REPLACE FUNCTION private.reject_unproven_invite_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.event_type = 'identity.invite.accepted'
    AND (NEW.origin <> 'database' OR pg_trigger_depth() < 2) THEN
    RAISE EXCEPTION 'invite acceptance requires Auth password change; received origin % and depth %',
      NEW.origin, pg_trigger_depth();
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.reject_unproven_invite_acceptance()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

CREATE TRIGGER security_audit_reject_unproven_invite_acceptance
  BEFORE INSERT ON private.security_audit_events
  FOR EACH ROW EXECUTE FUNCTION private.reject_unproven_invite_acceptance();
