-- RLS fase 1 — a base do controle de acesso.
--
-- Ordem importa: `student_specialists` vem primeiro porque cinco políticas já
-- existentes (meal_logs, health_daily_metrics, diet_plans, diet_meals,
-- diet_meal_items) consultam essa tabela para decidir acesso. Enquanto ela
-- aceitar INSERT direto, essas políticas são decorativas — basta inserir uma
-- linha de vínculo para o acesso ser concedido "legitimamente".
--
-- Verificado em 2026-08-11: um aluno recém-criado, sem vínculo algum, leu 9
-- perfis, 3 anamneses, 1 consentimento e 29 treinos, e teve o INSERT de vínculo
-- aceito.

-- ── Schema privado para os helpers ───────────────────────────────────────────
--
-- SECURITY DEFINER ignora RLS nas tabelas que toca. É o que evita recursão
-- quando a política de uma tabela precisa consultar a própria tabela — e é
-- também o que os torna perigosos. Por isso: schema não exposto, `auth.uid()`
-- checado dentro do corpo, e EXECUTE revogado de quem não deve chamar direto.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Sou specialist com vínculo ativo deste aluno?
CREATE OR REPLACE FUNCTION private.is_linked_specialist(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_specialists ss
    WHERE ss.student_id = p_student_id
      AND ss.specialist_id = (SELECT auth.uid())
      AND ss.status = 'active'
  );
$$;

-- Este specialist é meu, com vínculo ativo? (aluno lendo o perfil de quem o atende)
CREATE OR REPLACE FUNCTION private.is_my_specialist(p_specialist_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_specialists ss
    WHERE ss.specialist_id = p_specialist_id
      AND ss.student_id = (SELECT auth.uid())
      AND ss.status = 'active'
  );
$$;

-- A expressão de uma política RLS é avaliada com o papel de QUEM CONSULTA, não
-- com o do dono da tabela. Sem EXECUTE para `authenticated`, toda leitura das
-- tabelas protegidas falha com "permission denied for function" — erro 42501,
-- não lista vazia. Verificado ao aplicar: seis tabelas quebraram assim.
--
-- Conceder EXECUTE aqui é seguro porque a função não recebe o identificador do
-- chamador por parâmetro: ela lê `auth.uid()` internamente. O máximo que
-- responde é "eu estou vinculado a este aluno?", que o chamador já sabe.
--
-- O schema `private` também não é exposto pelo PostgREST — `config.toml` lista
-- apenas `public` e `graphql_public` —, então isto não cria endpoint novo.
REVOKE EXECUTE ON FUNCTION private.is_linked_specialist(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_my_specialist(uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_linked_specialist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_my_specialist(uuid) TO authenticated;

-- Índices para as colunas que as políticas filtram. Sem eles, cada checagem
-- vira seq scan em toda leitura de tabela protegida.
CREATE INDEX IF NOT EXISTS student_specialists_specialist_status_idx
  ON student_specialists (specialist_id, status);
CREATE INDEX IF NOT EXISTS student_specialists_student_status_idx
  ON student_specialists (student_id, status);

-- ── student_specialists ──────────────────────────────────────────────────────

ALTER TABLE student_specialists ENABLE ROW LEVEL SECURITY;

-- Cada lado enxerga os próprios vínculos.
CREATE POLICY "own_links_read" ON student_specialists
  FOR SELECT USING (
    student_id = (SELECT auth.uid()) OR specialist_id = (SELECT auth.uid())
  );

-- Encerrar vínculo é direito dos dois lados. WITH CHECK trava o destino em
-- 'inactive': sem isso, qualquer um dos dois reativaria um vínculo encerrado e
-- recuperaria acesso ao dado de saúde do outro.
CREATE POLICY "own_links_end" ON student_specialists
  FOR UPDATE USING (
    student_id = (SELECT auth.uid()) OR specialist_id = (SELECT auth.uid())
  )
  WITH CHECK (status = 'inactive');

-- Sem política de INSERT e de DELETE, de propósito. Vínculo nasce por
-- public.link_student_by_code(), definida abaixo.

-- ── profiles ─────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_own_and_linked" ON profiles
  FOR SELECT USING (
    id = (SELECT auth.uid())
    OR (SELECT private.is_linked_specialist(id))
    OR (SELECT private.is_my_specialist(id))
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- INSERT fica sem política: o perfil nasce pelo trigger handle_new_user, que é
-- SECURITY DEFINER. DELETE também não — conta se apaga por auth.users, e o
-- ON DELETE CASCADE cuida do resto.

-- ── student_consents ─────────────────────────────────────────────────────────

ALTER TABLE student_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consents_read_own_and_linked" ON student_consents
  FOR SELECT USING (
    student_id = (SELECT auth.uid())
    OR (SELECT private.is_linked_specialist(student_id))
  );

CREATE POLICY "consents_insert_own" ON student_consents
  FOR INSERT WITH CHECK (student_id = (SELECT auth.uid()));

-- Revogar é gravar revoked_at, nunca apagar a linha: o registro existe para
-- provar que o consentimento foi dado, e prova que o titular pode apagar não
-- prova nada. Por isso há UPDATE e não há DELETE.
CREATE POLICY "consents_revoke_own" ON student_consents
  FOR UPDATE USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

-- ── student_link_codes ───────────────────────────────────────────────────────

ALTER TABLE student_link_codes ENABLE ROW LEVEL SECURITY;

-- O aluno gere os próprios códigos. O specialist NÃO lê esta tabela: se lesse,
-- listaria todos os códigos válidos do sistema e se vincularia a qualquer um.
-- O resgate acontece dentro da função abaixo, que roda como definer.
CREATE POLICY "link_codes_own" ON student_link_codes
  FOR ALL USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

-- ── Vínculo por código, no servidor ──────────────────────────────────────────
--
-- Substitui os cinco passos que students.service.ts fazia no cliente: ler o
-- código, ler o serviço do specialist, checar duplicado, inserir e apagar o
-- código. Validação no cliente não é validação — o teste de 2026-08-11 pulou
-- ela inteira falando direto com o PostgREST.
--
-- Aqui os cinco passos são uma transação só, com o specialist saindo de
-- auth.uid() e não de um parâmetro que o chamador escolhe.

CREATE OR REPLACE FUNCTION public.link_student_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_specialist_id uuid := (SELECT auth.uid());
  v_student_id    uuid;
  v_service       public.service_type;
  v_clean_code    text := upper(trim(p_code));
BEGIN
  IF v_specialist_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado.');
  END IF;

  -- Só specialist vincula aluno. Sem esta checagem, um aluno resgataria o
  -- código de outro aluno e viraria "specialist" dele.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_specialist_id AND p.account_type = 'specialist'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas especialistas vinculam alunos.');
  END IF;

  SELECT slc.student_id INTO v_student_id
  FROM public.student_link_codes slc
  WHERE slc.code = v_clean_code AND slc.expires_at > now();

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado.');
  END IF;

  SELECT ss.service_type INTO v_service
  FROM public.specialist_services ss
  WHERE ss.specialist_id = v_specialist_id
  LIMIT 1;

  IF v_service IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Especialista sem serviço cadastrado.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_specialists s
    WHERE s.student_id = v_student_id
      AND s.service_type = v_service
      AND s.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aluno já vinculado a um especialista deste serviço.');
  END IF;

  INSERT INTO public.student_specialists (student_id, specialist_id, service_type, status)
  VALUES (v_student_id, v_specialist_id, v_service, 'active');

  DELETE FROM public.student_link_codes WHERE code = v_clean_code;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Esta é chamada pelo app, então authenticated precisa executar — ao contrário
-- dos helpers de private, que só as políticas usam.
REVOKE EXECUTE ON FUNCTION public.link_student_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_student_by_code(text) TO authenticated;
