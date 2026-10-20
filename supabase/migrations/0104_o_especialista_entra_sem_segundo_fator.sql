-- O especialista entra por senha (#428, ADR-0047): o cadastro do autenticador
-- era onde ele travava. Só o admin continua provando `aal2` ou Passkey com
-- TOTP verificado, porque alcança todas as contas.
--
-- As políticas que chamam esta função não mudam: o vínculo ativo e o
-- consentimento seguem limitando o especialista aos próprios alunos. Para
-- voltar a exigir dele, inclua 'specialist' no IN abaixo, junto com
-- `isStrongAuthRequired` em `shared/src/auth/session-proof.ts`. O predicado de
-- antes está na 0078.
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
        AND profile.account_type IN ('admin')
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
