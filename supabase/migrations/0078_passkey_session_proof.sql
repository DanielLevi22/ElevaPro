-- A Passkey é autenticada pelo Supabase Auth como primeiro fator (aal1).
-- Aceitamos somente seu método no AMR do JWT assinado; login por senha em aal1
-- continua sem acesso aos dados de alunos. O aal2 preserva a migração TOTP.
CREATE OR REPLACE FUNCTION private.current_session_meets_mfa_requirement()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.account_type IN ('admin', 'specialist')
    )
      THEN COALESCE(
        (SELECT auth.jwt() ->> 'aal') = 'aal2'
        OR (
          (SELECT auth.jwt() -> 'amr') @> '[{"method":"passkey"}]'::jsonb
          AND EXISTS (
            SELECT 1 FROM auth.mfa_factors factor
            WHERE factor.user_id = (SELECT auth.uid())
              AND factor.factor_type = 'totp'
              AND factor.status = 'verified'
          )
        ),
        false
      )
    ELSE EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id = (SELECT auth.uid())
    )
  END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.current_session_meets_mfa_requirement()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_session_meets_mfa_requirement()
  TO authenticated;
