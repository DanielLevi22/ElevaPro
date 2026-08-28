-- Especialista nasce aguardando aprovação, não ativo.
--
-- O `/admin` tem uma tela de aprovações desde sempre, e ela nunca aprovou
-- ninguém: `handle_new_user` gravava `account_status = 'active'` para todo
-- mundo, então nenhuma conta chegava a ficar pendente. A tela filtrava por
-- `'pending'` — valor que o enum nunca teve —, o que escondia o problema por
-- trás de um "Tudo em dia!" permanente.
--
-- As duas metades foram corrigidas juntas: a tela passou a filtrar `'invited'`
-- (o estado real de quem espera) e o trigger passa a produzi-lo.
--
-- Só o especialista espera. Aluno e member nascem ativos porque não há o que
-- aprovar: aluno entra por convite de um profissional que já foi aprovado, e
-- member gerencia apenas os próprios dados. Admin não nasce por cadastro
-- público — vem por convite.
--
-- O caminho de bloqueio já existia dos dois lados e ficava inalcançável:
-- `LoginScreen` (mobile) e `/auth/pending-approval` (web) redirecionam quem
-- está `invited`. Esta migration é o que finalmente leva alguém até lá.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tipo public.account_type;
BEGIN
  -- O default continua sendo o papel menos privilegiado: um caminho novo que
  -- esqueça `account_type` cria um member, não um profissional com acesso a
  -- dado de aluno. Errar para menos gera chamado; errar para mais gera
  -- vazamento (ver a migration 0021).
  tipo := COALESCE(
    (NEW.raw_user_meta_data->>'account_type')::public.account_type,
    'member'
  );

  INSERT INTO public.profiles (id, email, full_name, account_type, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    tipo,
    CASE WHEN tipo = 'specialist' THEN 'invited' ELSE 'active' END::public.account_status
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria o profile no signup. Especialista nasce invited e passa pela aprovação do /admin; aluno e member nascem ativos.';
