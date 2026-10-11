-- Gravar a anamnese passa a exigir consentimento de saúde vigente, no banco.
--
-- A `0017` deu ao aluno `anamnesis_own` como `FOR ALL`, sem consultar
-- `student_consents`. A base legal da anamnese é consentimento explícito
-- (Art. 11, I; LGPD_COMPLIANCE.md §2.2), e quem recusava o portão e respondia
-- o questionário gravava do mesmo jeito. Achado do `/lgpd-check` da #365: o
-- onboarding do Praticante coleta peso, altura e a triagem de saúde, e a
-- barreira não pode morar só na tela.
--
-- Mesmo desenho da água (`0052`) e da medida declarada (`0056`): ler e apagar o
-- próprio dado continuam livres, porque revogar interrompe a coleta e não tira
-- do titular o que é dele (§7); gravar e corrigir exigem o aceite.
--
-- O helper é o estrito (`has_health_consent`), e não o `health_consent_not_revoked`
-- de `meal_logs`: quem nunca consentiu também não grava. Anamnese antiga sem
-- registro de aceite continua legível e apagável; corrigir pede o aceite antes.

DROP POLICY IF EXISTS "anamnesis_own" ON "student_anamnesis";
--> statement-breakpoint

CREATE POLICY "anamnesis_own_select" ON "student_anamnesis"
  FOR SELECT TO authenticated USING ("student_id" = (SELECT auth.uid()));
--> statement-breakpoint

CREATE POLICY "anamnesis_own_insert" ON "student_anamnesis"
  FOR INSERT TO authenticated WITH CHECK (
    "student_id" = (SELECT auth.uid())
    AND (SELECT private.has_health_consent("student_id"))
  );
--> statement-breakpoint

-- O upsert do app vira UPDATE quando a linha existe: a retomada do onboarding
-- grava a cada tela, e cada gravação passa por aqui.
CREATE POLICY "anamnesis_own_update" ON "student_anamnesis"
  FOR UPDATE TO authenticated
  USING ("student_id" = (SELECT auth.uid()))
  WITH CHECK (
    "student_id" = (SELECT auth.uid())
    AND (SELECT private.has_health_consent("student_id"))
  );
--> statement-breakpoint

-- Apagar a própria anamnese é eliminação (Art. 18, VI): não depende de consentimento,
-- senão quem revogou ficaria preso ao dado que não quer mais ali.
CREATE POLICY "anamnesis_own_delete" ON "student_anamnesis"
  FOR DELETE TO authenticated USING ("student_id" = (SELECT auth.uid()));
