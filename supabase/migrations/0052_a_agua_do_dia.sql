-- A água do dia: um total por aluno por dia.
--
-- Issue #298, com o parecer do /lgpd-check comentado nela.
--
-- Base legal: Tutela da Saúde (Art. 11, II, f) + Consentimento (Art. 11, I) —
-- é registro alimentar, a mesma base de `meal_logs`.
--
-- **Um total por dia, e não um registro por copo.** A série de cada copo
-- revelaria a rotina do dia inteiro — quando acorda, quando sai, quando dorme —
-- para uma finalidade que o total entrega: acompanhar a meta de água. Mesma
-- minimização de `health_daily_metrics` (0015).
--
-- **Sem leitura do especialista.** Nenhuma tela do especialista consome o dado,
-- e abrir a leitura agora é o "pode ser útil no futuro" que o §2.3 da
-- LGPD_COMPLIANCE.md recusa. A tabela entra mesmo assim na lista de Art. 11 da
-- `verify-rls.sql`: a primeira política de especialista que aparecer já nasce
-- obrigada a consultar o consentimento.
--
-- Retenção: enquanto a conta existir (ON DELETE CASCADE a partir de profiles).

CREATE TABLE "hydration_daily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL
    REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "water_ml" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  -- A escrita é upsert por dia: tocar num copo reescreve o total de hoje.
  -- A chave única também é o índice da consulta dominante (aluno, intervalo).
  CONSTRAINT "hydration_daily_student_id_date_unique" UNIQUE ("student_id", "date"),
  -- Barreira de unidade, como o sono e a FC da 0046: litro gravado como ml, ou
  -- um toque repetido por bug, gravaria um número clínico absurdo para sempre.
  -- 10 L em um dia é acima do que qualquer prescrição pede.
  CONSTRAINT "hydration_daily_water_ml_plausible" CHECK ("water_ml" >= 0 AND "water_ml" <= 10000)
);
--> statement-breakpoint

COMMENT ON TABLE "hydration_daily" IS
  'Água bebida por dia, em ml. Art. 11, II, f + I. Um total diário: a série de copos revelaria rotina (issue #298). Sem leitura do especialista enquanto nenhuma tela dele consome.';
--> statement-breakpoint

ALTER TABLE "hydration_daily" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- As default privileges do Supabase voltam a conceder a cada tabela nova (0020,
-- 0049): sem este revoke, dado de saúde fica ao alcance da chave anônima, que
-- vai no bundle do app.
REVOKE ALL ON "hydration_daily" FROM anon;
--> statement-breakpoint

-- Sem política de DELETE, e sem o privilégio também: corrigir o dia é gravar
-- outro total (UPDATE), e a eliminação chega pelo CASCADE da conta. Não existe
-- "FOR ALL exceto DELETE" — foi assim que a 0017 concedeu um DELETE que ninguém
-- decidiu conceder.
REVOKE DELETE ON "hydration_daily" FROM authenticated;
--> statement-breakpoint

-- O aluno lê a própria água. Histórico dele, sempre: revogar o consentimento
-- interrompe a coleta, e não apaga o que já foi registrado (§7).
CREATE POLICY "hydration_own_select" ON "hydration_daily"
  FOR SELECT USING ("student_id" = (SELECT auth.uid()));
--> statement-breakpoint

-- Gravar exige consentimento vigente, no banco. O helper é o estrito, e não o
-- `health_consent_not_revoked` de `meal_logs`: esta tabela nasce depois do
-- portão de consentimento, então não existe acervo sem registro para proteger.
CREATE POLICY "hydration_own_insert" ON "hydration_daily"
  FOR INSERT WITH CHECK (
    "student_id" = (SELECT auth.uid())
    AND (SELECT private.has_health_consent("student_id"))
  );
--> statement-breakpoint

-- Corrigir o total do dia (Art. 18, III) com a mesma condição de gravar.
CREATE POLICY "hydration_own_update" ON "hydration_daily"
  FOR UPDATE
  USING ("student_id" = (SELECT auth.uid()))
  WITH CHECK (
    "student_id" = (SELECT auth.uid())
    AND (SELECT private.has_health_consent("student_id"))
  );
