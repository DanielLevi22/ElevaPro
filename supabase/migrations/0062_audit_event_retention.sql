-- Retenção verificável da trilha de auditoria (issue #322).
-- O reset remoto recria o banco sem garantir que a extensão configurada no
-- painel esteja habilitada neste database; habilitá-la aqui mantém o job como
-- parte verificável do schema, sem depender de uma etapa manual.

CREATE EXTENSION IF NOT EXISTS pg_cron;
--> statement-breakpoint

DO $$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NULL THEN
    RAISE EXCEPTION
      'pg_cron is not enabled. Enable it in Supabase Dashboard > Integrations > Cron before applying migration 0062.';
  END IF;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.purge_expired_security_audit_events()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted bigint;
BEGIN
  DELETE FROM private.security_audit_events WHERE expires_at <= clock_timestamp();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.purge_expired_security_audit_events()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

-- A migration pode rodar novamente em preview/restauração sem duplicar o job.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'purge-security-audit-events'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'purge-security-audit-events',
    '17 3 * * *',
    'SELECT private.purge_expired_security_audit_events()'
  );
END;
$$;
--> statement-breakpoint

COMMENT ON FUNCTION private.purge_expired_security_audit_events() IS
  'Remove diariamente os eventos de auditoria que passaram da retenção de 365 dias.';
