-- Ninguém se promove a admin.
--
-- Havia dois caminhos abertos, e os dois foram verificados contra o banco local
-- em 2026-09-03, com resposta HTTP 200 nos dois casos:
--
--   1. `handle_new_user` lia `account_type` de `raw_user_meta_data`, que é
--      escrito pelo cliente no `auth.signUp`. Um cadastro público com
--      `data: { account_type: 'admin' }` nascia admin ativo — sem convite, sem
--      aprovação, sem credencial nenhuma.
--
--   2. A política `profiles_update_own` (migration 0016) permite ao usuário
--      atualizar a própria linha, e política de RLS não distingue coluna. Então
--      qualquer conta já logada fazia `UPDATE profiles SET account_type =
--      'admin' WHERE id = auth.uid()` e virava admin. Este é o pior dos dois:
--      não precisa nem de cadastro novo.
--
-- A intenção já estava escrita em três lugares e não era imposta em nenhum: o
-- comentário da 0034 ("Admin não nasce por cadastro público — vem por
-- convite"), o tipo de `setAccountType` (`Exclude<AccountType, "admin">`) e o
-- `if (selectedRole === 'admin')` da tela de onboarding do mobile. Tipo e tela
-- são conforto, não barreira: quem chama o PostgREST direto não passa por
-- nenhum dos dois.
--
-- É a mesma doutrina que `web/src/lib/api-auth.ts` enuncia para o BFF — o
-- `account_type` sai de `profiles`, nunca do que o cliente mandou. Faltava
-- valer para quem escreve na `profiles`.
--
-- Admin passa a ser exclusivamente promoção manual, por quem já tem
-- `service_role`: `UPDATE profiles SET account_type = 'admin' WHERE ...`.

-- ── 1. O trigger só aceita os papéis que têm caminho legítimo ─────────────────
--
-- Lista explícita em vez de cast defensivo, por dois motivos: cast de valor
-- fora do enum aborta o cadastro inteiro, e um papel novo adicionado ao enum
-- passaria a ser auto-declarável sem ninguém decidir isso. Com a lista,
-- alargar é uma decisão que alguém toma escrevendo aqui.
--
-- Os três continuam passando porque cada um tem caminho legítimo:
--   member     — cadastro público (`signUpMember`), e o default de quem omite
--   student    — criado por profissional via `api/students`, sem privilégio novo
--   specialist — se declara, mas nasce `invited` e espera a aprovação do /admin,
--                que é exatamente o portão desenhado na 0034

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pedido text;
  tipo public.account_type;
BEGIN
  pedido := NEW.raw_user_meta_data->>'account_type';

  -- Rebaixar em vez de abortar o cadastro segue a doutrina da 0021: errar para
  -- menos gera chamado, errar para mais gera vazamento. O WARNING existe para a
  -- tentativa não passar calada — sem ele, um ataque fica indistinguível de um
  -- cadastro comum no log.
  IF pedido IS NOT NULL AND pedido NOT IN ('member', 'student', 'specialist') THEN
    RAISE WARNING 'signup pediu account_type=% para %; rebaixado a member',
      left(pedido, 32), NEW.id;
    pedido := NULL;
  END IF;

  tipo := COALESCE(pedido::public.account_type, 'member');

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
  'Cria o profile no signup. Aceita apenas member, student e specialist vindos do metadata — admin e valor desconhecido caem para member. Especialista nasce invited e passa pela aprovação do /admin.';

-- ── 2. A coluna do papel deixa de ser escrita pelo dono da linha ──────────────
--
-- RLS decide QUAIS LINHAS; privilégio de coluna decide QUAIS COLUNAS. A 0016
-- resolveu a primeira metade e a segunda ficou aberta — `profiles_update_own`
-- continua valendo e continua certa, ela só nunca teve como dizer "menos
-- account_type".
--
-- O que sobra atualizável é o que o próprio usuário edita sobre si mesmo. Fora
-- da lista, e de propósito: `account_type` e `account_status` (privilégio),
-- `id` e `created_at` (identidade), `email` (espelha `auth.users`, e reescrevê-lo
-- deixaria uma conta se apresentar como outra no /admin) e `admin_notes`, que é
-- anotação sobre o usuário e não dele.

REVOKE UPDATE ON public.profiles FROM authenticated, anon;

GRANT UPDATE (full_name, avatar_url, coach_mode, persona_track)
  ON public.profiles TO authenticated;

-- ── 3. A porta estreita que o onboarding usa ─────────────────────────────────
--
-- A tela de escolha de papel do mobile precisa gravar `account_type`, e é um
-- caminho legítimo. Ele passa a ser esta função em vez do UPDATE direto: uma
-- porta só, que recusa `admin` no servidor e aplica a mesma regra do trigger
-- para specialist.
--
-- Reescolher é permitido de propósito — a tela pode ser revisitada, e nenhuma
-- troca daqui ganha privilégio: specialist volta para `invited` e espera
-- aprovação de novo.

CREATE OR REPLACE FUNCTION public.set_own_account_type(
  p_account_type public.account_type,
  p_full_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quem uuid := auth.uid();
BEGIN
  IF quem IS NULL THEN
    RAISE EXCEPTION 'set_own_account_type exige sessão autenticada (auth.uid() veio nulo)';
  END IF;

  IF p_account_type = 'admin' THEN
    RAISE EXCEPTION 'account_type % não pode ser escolhido pelo próprio usuário (esperado: member, student ou specialist)',
      p_account_type;
  END IF;

  UPDATE public.profiles
  SET account_type = p_account_type,
      account_status = CASE
        WHEN p_account_type = 'specialist' THEN 'invited'
        ELSE 'active'
      END::public.account_status,
      full_name = COALESCE(NULLIF(p_full_name, ''), full_name)
  WHERE id = quem;
END;
$$;

COMMENT ON FUNCTION public.set_own_account_type(public.account_type, text) IS
  'Onboarding de papel. Escreve account_type do próprio usuário, recusa admin e devolve specialist para invited.';

-- `public` inclui `anon`: sem revogar, quem não fez login executaria a função,
-- que então falharia no auth.uid() nulo — erro certo pelo motivo errado.
REVOKE ALL ON FUNCTION public.set_own_account_type(public.account_type, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_own_account_type(public.account_type, text) TO authenticated;
