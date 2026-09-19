-- MFA não pode ser só uma tela: o mobile também consulta PostgREST diretamente.
-- Esta policy restritiva soma-se às políticas existentes sem reescrever a regra
-- de cada domínio. Student/member preserva o fluxo atual; admin/specialist só
-- passa quando o JWT assinado pelo Supabase declara aal2.

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
      THEN COALESCE((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
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
--> statement-breakpoint

DO $$
DECLARE
  protected_table record;
BEGIN
  FOR protected_table IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = table_name
          AND rowsecurity
      )
  LOOP
    EXECUTE format(
      'CREATE POLICY privileged_session_requires_mfa ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (private.current_session_meets_mfa_requirement()) WITH CHECK (private.current_session_meets_mfa_requirement())',
      protected_table.table_schema,
      protected_table.table_name
    );
  END LOOP;
END;
$$;
--> statement-breakpoint

-- Arquivos de avaliações também passam por PostgREST Storage e podem ser lidos
-- por specialist. A mesma trava precisa alcançar esse caminho paralelo.
CREATE POLICY privileged_session_requires_mfa ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement())
  WITH CHECK (private.current_session_meets_mfa_requirement());
