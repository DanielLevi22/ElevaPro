-- Funções de trigger e event trigger não são endpoints PostgREST (issue #322).
-- Grants padrão em PUBLIC as deixavam chamáveis mesmo quando só o banco deve
-- executá-las. A migration fecha essa superfície e fixa resolução de nomes.

ALTER FUNCTION public.foods_search_vector_update()
  SET search_path = pg_catalog;
--> statement-breakpoint

ALTER FUNCTION public.update_ai_chat_session_timestamp()
  SET search_path = pg_catalog, public;
--> statement-breakpoint

ALTER FUNCTION public.handle_new_user()
  SET search_path = pg_catalog, public;
--> statement-breakpoint

ALTER FUNCTION public.set_own_account_type(public.account_type, text)
  SET search_path = pg_catalog, public;
--> statement-breakpoint

-- A execução ocorre pelo trigger associado. Revogar não interrompe o trigger,
-- mas impede que uma função de trigger seja oferecida como RPC por engano.
REVOKE ALL ON FUNCTION public.foods_search_vector_update()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_ai_chat_session_timestamp()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint

-- Alguns projetos não possuem o event trigger legado. Quando existir, só o
-- mecanismo DDL o invoca; quando não existir, não é uma superfície a fechar.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.rls_auto_enable()
      FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END;
$$;
--> statement-breakpoint

-- Esta é a única RPC deste conjunto que faz parte do produto. O login anônimo
-- não pode alcançá-la; a função ainda valida auth.uid() como defesa adicional.
REVOKE ALL ON FUNCTION public.set_own_account_type(public.account_type, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_own_account_type(public.account_type, text)
  TO authenticated;
