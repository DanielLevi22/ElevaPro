-- A sessão AAL1 precisa ler a própria identidade para o cliente saber que deve
-- abrir o desafio TOTP. A policy continua restritiva para qualquer outro perfil
-- e para toda tabela de domínio: esta é a porta mínima, não um bypass de MFA.

ALTER POLICY privileged_session_requires_mfa ON public.profiles
  USING (
    private.current_session_meets_mfa_requirement()
    OR id = (SELECT auth.uid())
  )
  WITH CHECK (
    private.current_session_meets_mfa_requirement()
    OR id = (SELECT auth.uid())
  );
