-- O especialista deixa de esperar aprovação.
--
-- Issue #281. Decisão de produto: o cadastro de Specialist entra direto, sem
-- passar pelo portão do /admin. A `0034` tinha construído esse portão de
-- propósito — e consertado as duas metades quebradas dele, porque a tela
-- filtrava por `'pending'`, valor que o enum nunca teve, e o trigger marcava
-- todo mundo como `active`. A `0040` reafirmou o comportamento ao reescrever a
-- função por outro motivo.
--
-- Agora ele sai. O que muda é o modelo de negócio, não a segurança: o portão
-- protegia contra cadastro indevido de profissional, e essa proteção passa a
-- ser o funil comercial, não uma fila de aprovação manual. Quem preferir o
-- portão de volta precisa reverter esta migration **e** a interface — as duas
-- metades andam juntas, que é a lição da 0034.
--
-- ## O `invited` continua existindo, e continua significando algo
--
-- O estado tem dois usos no código, e só um está sendo removido:
--
--   specialist invited  →  espera aprovação do /admin          REMOVIDO AQUI
--   student    invited  →  provisionado pelo Specialist,       CONTINUA
--                          ainda não entrou no app
--
-- O segundo é regra viva: `POST /api/students` cria o aluno nesse estado
-- (Fluxo A), e a lista de alunos mostra o selo de convite e a expiração a
-- partir dele. Por isso o enum não muda e nenhuma linha de aluno é tocada.

-- ── 1. O trigger de signup para de criar especialista pendente ───────────────
--
-- Reescrita completa da função da `0040`, e não um `ALTER`: só a última linha
-- do INSERT muda, mas `CREATE OR REPLACE FUNCTION` exige o corpo inteiro. Todo
-- o resto — o rebaixamento de papel desconhecido e o WARNING que o registra —
-- é a correção de escalada da 0040 e é preservado palavra por palavra.

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
    'active'::public.account_status
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria o profile no signup. Aceita apenas member, student e specialist vindos do metadata — admin e valor desconhecido caem para member. Toda conta nasce ativa: a aprovação de especialista foi removida na 0050.';

-- ── 2. Quem já estava na fila entra ──────────────────────────────────────────
--
-- Sem isto, o especialista cadastrado entre a `0034` e hoje fica preso: a tela
-- que o recebia deixa de existir neste mesmo PR, e a lista do /admin que o
-- aprovaria também. Ele entraria num app sem porta.
--
-- O filtro por `account_type` é o que protege o aluno: um `UPDATE` em
-- `account_status = 'invited'` sem ele apagaria o estado de convite de todo
-- aluno provisionado e ainda não logado, que é justamente o uso que fica.

UPDATE public.profiles
SET account_status = 'active'
WHERE account_type = 'specialist'
  AND account_status = 'invited';
