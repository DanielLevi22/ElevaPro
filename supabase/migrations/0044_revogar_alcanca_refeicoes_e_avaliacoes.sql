-- Revogar o consentimento fecha o acesso do especialista também a
-- `meal_logs` e `physical_assessments`.
--
-- A `0043` fechou `health_daily_metrics`. Estas duas tinham a mesma lacuna: a
-- `LGPD_COMPLIANCE.md` §7 as citava como tendo o mesmo comportamento de
-- revogação, e nenhuma das três consultava `student_consents`. Mesma leitura do
-- Art. 11: a base do especialista é tutela da saúde (II, f) **mais**
-- consentimento (I).
--
-- ── Por que o helper é outro, e não o da 0043 ────────────────────────────────
--
-- `private.has_health_consent` exige consentimento **presente**: sem linha em
-- `student_consents`, nega. Lá isso é seguro, porque sem consentimento o dado
-- nunca chega a existir — `healthSync.ts` recusa a escrita antes de gravar, e
-- a única forma de haver métrica diária é ter havido consentimento.
--
-- Aqui não vale. Avaliação física e registro de refeição nascem por caminhos
-- que **nunca** checaram consentimento: o especialista cria a avaliação
-- presencialmente pela `assessments_specialist_insert`, e o aluno registra a
-- refeição pela `student_own_meal_logs`. Existe acervo gravado sem linha
-- nenhuma em `student_consents`.
--
-- Usar o helper estrito aqui apagaria do painel toda avaliação de todo aluno
-- que ainda não passou pelo portão de consentimento — inclusive a que o
-- especialista acabou de tirar, que ele não conseguiria reler. Seria trocar uma
-- lacuna de conformidade por um incidente de produto.
--
-- Então a regra aqui é a **revogação explícita**: quem revogou fecha; quem
-- nunca registrou nada segue como antes. Ausência de consentimento é problema
-- real, mas o remédio dela é o portão de coleta no app, não retirar do
-- profissional o histórico clínico do aluno que está na frente dele.
--
-- **Para apertar isto depois** — quando todo aluno ativo tiver consentimento
-- registrado — basta trocar `health_consent_not_revoked` por
-- `has_health_consent` nas duas políticas abaixo. Não faça a troca sem antes
-- medir quantos alunos com vínculo ativo não têm linha em `student_consents`:
-- é exatamente o número de painéis que ficariam vazios.

CREATE OR REPLACE FUNCTION private.health_consent_not_revoked(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.student_consents sc
    WHERE sc.student_id = p_student_id
      AND sc.consent_type = 'health_data_collection'
      AND sc.revoked_at IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION private.health_consent_not_revoked(uuid) TO authenticated;

COMMENT ON FUNCTION private.health_consent_not_revoked(uuid) IS
  'Falso apenas quando há revogação explícita. Ausência de registro não bloqueia — ver 0044.';

-- ── meal_logs ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "specialist_read_linked_meal_logs" ON "meal_logs";

CREATE POLICY "specialist_read_consented_meal_logs" ON "meal_logs"
  FOR SELECT USING (
    private.is_linked_specialist(student_id)
    AND private.health_consent_not_revoked(student_id)
  );

-- ── physical_assessments ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "assessments_specialist_read" ON "physical_assessments";

CREATE POLICY "assessments_specialist_read" ON "physical_assessments"
  FOR SELECT USING (
    private.is_linked_specialist(student_id)
    AND private.health_consent_not_revoked(student_id)
  );

-- O INSERT também: coletar dado de saúde novo de quem revogou é o caso mais
-- claro do Art. 11, e sem isto o especialista poderia criar uma avaliação que
-- nem ele nem ninguém consegue reler — escrita cega, pior que a recusa.
DROP POLICY IF EXISTS "assessments_specialist_insert" ON "physical_assessments";

CREATE POLICY "assessments_specialist_insert" ON "physical_assessments"
  FOR INSERT WITH CHECK (
    private.is_linked_specialist(student_id)
    AND private.health_consent_not_revoked(student_id)
  );

-- O próprio aluno continua lendo e registrando o que é dele: revogar interrompe
-- a coleta e o compartilhamento, não exerce a eliminação (Art. 18, VI).
-- `assessments_student_read` e `student_own_meal_logs` seguem intocadas.
