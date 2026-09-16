-- A medida declarada pelo próprio aluno (issue #312).
--
-- Até aqui a Assessment era só do especialista: "medida pelo especialista, com
-- fita". O Praticante, o modo principal (ADR-0028), não tem especialista, e ficava
-- sem composição nem medidas para acompanhar. A partir desta migration a mesma
-- tabela guarda as duas origens, e a coluna `measured_by` diz qual.
--
--   specialist  medida pelo especialista vinculado; imutável, como sempre foi
--   self        declarada pelo próprio aluno; ele corrige e apaga
--
-- Por que a mesma tabela, e não uma nova: é a mesma grandeza com outra origem, e
-- as telas de composição, medidas e comparação leem uma tabela só, filtrando a
-- origem. As séries nunca misturam as duas (regra das telas, `measurementSeries`).
--
-- Base legal: Tutela da Saúde (Art. 11, II, f) + Consentimento (Art. 11, I), a da
-- tabela. O que muda é quem coleta, e por isso o texto do consentimento passa a
-- citar a medida registrada pelo próprio aluno (`POLICY_VERSION` 1.8).
--
-- A regra de imutabilidade da 0017 continua para a medida do especialista:
-- corrigir medida clínica reescreve o histórico, e o remédio é medir de novo.
-- A declarada é outra coisa: é o que o titular disse, e o direito de correção
-- (Art. 18, III) e de exclusão (Art. 18, VI) alcança o que ele declarou.

CREATE TYPE "measurement_source" AS ENUM ('specialist', 'self');
--> statement-breakpoint

ALTER TABLE "physical_assessments"
  ADD COLUMN "measured_by" "measurement_source" NOT NULL DEFAULT 'specialist';
--> statement-breakpoint

COMMENT ON COLUMN "physical_assessments"."measured_by" IS
  'Quem mediu: specialist (imutável) ou self (declarada pelo aluno, corrigível). Séries e comparações nunca misturam as duas.';
--> statement-breakpoint

-- A declarada não tem especialista: um `specialist_id` nela diria ao painel que
-- alguém com fita a mediu.
ALTER TABLE "physical_assessments"
  ADD CONSTRAINT "physical_assessments_self_has_no_specialist"
  CHECK ("measured_by" = 'specialist' OR "specialist_id" IS NULL);
--> statement-breakpoint

-- A Escala do Body scan ganha a terceira origem. A ordem é especialista, declarada,
-- anamnese: quem lê o scan precisa saber quando a altura foi digitada pelo aluno.
ALTER TYPE "scale_source" ADD VALUE IF NOT EXISTS 'self';
--> statement-breakpoint

-- Tenho especialista com vínculo ativo? Sem parâmetro de propósito: responde só
-- sobre quem chama, e não vira um jeito de perguntar pelo vínculo de outra pessoa.
CREATE OR REPLACE FUNCTION private.i_have_active_specialist()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_specialists ss
    WHERE ss.student_id = (SELECT auth.uid())
      AND ss.status = 'active'
  );
$$;
--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION private.i_have_active_specialist() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.i_have_active_specialist() TO authenticated;
--> statement-breakpoint

-- O especialista só grava medida dele. Sem isto ele poderia gravar uma linha
-- `self`, que o aluno depois corrigiria achando que foi ele quem digitou.
DROP POLICY IF EXISTS "assessments_specialist_insert" ON "physical_assessments";
--> statement-breakpoint
CREATE POLICY "assessments_specialist_insert" ON "physical_assessments"
  FOR INSERT TO authenticated WITH CHECK (
    "measured_by" = 'specialist'
    AND (SELECT private.is_linked_specialist("student_id"))
    AND (SELECT private.health_consent_not_revoked("student_id"))
  );
--> statement-breakpoint

-- Declarar é do Praticante: com especialista ativo, quem mede é ele (ADR-0028). E
-- exige consentimento vigente no banco, como a água: a tabela de avaliações tem
-- acervo antigo, mas a declaração nasce agora, depois do portão.
CREATE POLICY "assessments_self_insert" ON "physical_assessments"
  FOR INSERT TO authenticated WITH CHECK (
    "student_id" = (SELECT auth.uid())
    AND "measured_by" = 'self'
    AND "specialist_id" IS NULL
    AND NOT (SELECT private.i_have_active_specialist())
    AND (SELECT private.has_health_consent("student_id"))
  );
--> statement-breakpoint

-- Corrigir o que declarou (Art. 18, III), inclusive depois de contratar um
-- especialista: o direito é sobre o dado dele, e não sobre a Guidance de hoje.
-- A linha continua `self` e sem especialista: corrigir não troca a origem.
CREATE POLICY "assessments_self_update" ON "physical_assessments"
  FOR UPDATE TO authenticated
  USING ("student_id" = (SELECT auth.uid()) AND "measured_by" = 'self')
  WITH CHECK (
    "student_id" = (SELECT auth.uid())
    AND "measured_by" = 'self'
    AND "specialist_id" IS NULL
    AND (SELECT private.has_health_consent("student_id"))
  );
--> statement-breakpoint

-- Apagar o que declarou (Art. 18, VI), sem exigir consentimento: quem revogou
-- continua podendo eliminar. A medida do especialista não passa nesta política.
CREATE POLICY "assessments_self_delete" ON "physical_assessments"
  FOR DELETE TO authenticated
  USING ("student_id" = (SELECT auth.uid()) AND "measured_by" = 'self');
--> statement-breakpoint

-- As telas pedem a série do aluno por origem e data.
CREATE INDEX IF NOT EXISTS "physical_assessments_student_source_date_idx"
  ON "physical_assessments" ("student_id", "measured_by", "assessed_at");
