-- AAL1 precisa conhecer somente os próprios serviços para construir o contexto de
-- autorização e conduzir a conta ao TOTP. O plano alimentar continua inacessível:
-- esta exceção não alcança tabelas de domínio nem permite mudar o próprio serviço.

DROP POLICY privileged_session_requires_mfa ON public.specialist_services;
--> statement-breakpoint

CREATE POLICY privileged_session_requires_mfa ON public.specialist_services
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    private.current_session_meets_mfa_requirement()
    OR specialist_id = (SELECT auth.uid())
  );
--> statement-breakpoint

CREATE POLICY privileged_session_requires_mfa_on_insert ON public.specialist_services
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint

CREATE POLICY privileged_session_requires_mfa_on_update ON public.specialist_services
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (private.current_session_meets_mfa_requirement())
  WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint

CREATE POLICY privileged_session_requires_mfa_on_delete ON public.specialist_services
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (private.current_session_meets_mfa_requirement());
