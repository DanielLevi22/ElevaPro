-- Revogar o consentimento de saúde fecha o acesso do especialista.
--
-- Até aqui a `LGPD_COMPLIANCE.md` §7 afirmava que, revogado o consentimento, "o
-- especialista perde o acesso pela RLS". Não era verdade: nenhuma política de
-- `health_daily_metrics` consultava `student_consents`, e a única checagem
-- existente morava no cliente, em `healthSync.ts`, onde só alcança a escrita.
-- Quem revogava interrompia a coleta e seguia com o histórico inteiro visível.
--
-- O aluno tem dois caminhos de saída, com escopos diferentes, e agora os dois
-- são reais:
--
--   revogar o consentimento → o especialista perde o dado de saúde coletado
--   encerrar o vínculo      → o especialista perde tudo do aluno
--
-- O segundo já funcionava desde a `0015` (`status = 'active'`). Esta migration
-- entrega o primeiro.
--
-- Base legal: para o especialista ler dado de saúde, o Art. 11 pede tutela da
-- saúde (II, f) **e** consentimento (I). Caiu o consentimento, caiu a base — e
-- a partir daqui isso é regra do banco, não promessa de documento.
--
-- O próprio aluno continua vendo o histórico depois de revogar: `revoked_at`
-- interrompe a coleta e o compartilhamento, não exerce o direito de eliminação
-- (Art. 18, VI), que segue disponível à parte.

-- ── Helper ───────────────────────────────────────────────────────────────────

-- Mesmo padrão dos helpers da 0016: schema privado, SECURITY DEFINER para não
-- depender da RLS de `student_consents` (o especialista lê aquela tabela por
-- `consents_read_own_and_linked`, mas fazer uma política depender da política
-- de outra tabela é acoplamento que quebra sem avisar).
CREATE OR REPLACE FUNCTION private.has_health_consent(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_consents sc
    WHERE sc.student_id = p_student_id
      AND sc.consent_type = 'health_data_collection'
      AND sc.given_at IS NOT NULL
      AND sc.revoked_at IS NULL
  );
$$;

-- **Deliberadamente sem comparar `policy_version`.** O cliente compara, e deve:
-- quem está numa versão antiga precisa reconsentir antes de a coleta seguir. A
-- RLS não pode fazer o mesmo, porque o banco não sabe qual versão o build
-- vigente conhece — e amarrar a leitura à versão faria toda subida de
-- `POLICY_VERSION` esvaziar o painel de todos os especialistas até cada aluno
-- reabrir o app. Texto desatualizado é motivo para parar de coletar, não para
-- retirar do profissional o que já foi coletado com autorização válida.

-- A expressão da política roda com o papel de quem consulta. Sem este GRANT a
-- leitura falha com 42501 em vez de devolver lista vazia — foi o que quebrou
-- seis tabelas quando a 0016 foi aplicada.
GRANT EXECUTE ON FUNCTION private.has_health_consent(uuid) TO authenticated;

-- ── Política ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "specialist_read_linked_health_metrics" ON "health_daily_metrics";

CREATE POLICY "specialist_read_consented_health_metrics" ON "health_daily_metrics"
  FOR SELECT USING (
    private.is_linked_specialist(student_id)
    AND private.has_health_consent(student_id)
  );

COMMENT ON FUNCTION private.has_health_consent(uuid) IS
  'Consentimento de coleta de saúde dado e não revogado, em qualquer versão da política. Ver 0043.';
