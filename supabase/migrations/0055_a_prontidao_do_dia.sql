-- A prontidão do dia (issue #308, ADR-0029).
--
-- Duas colunas em health_daily_metrics:
--
--   readiness_score     a nota de 0 a 100 do dia
--   readiness_version   a versão da regra que calculou a nota
--
-- A nota sai do sono e da FC de repouso de hoje contra os 14 dias anteriores do
-- próprio aluno, calculada no aparelho (`computeReadiness`, no shared). É
-- derivada de colunas que já existem, e mesmo assim é gravada: o que o aluno viu
-- num dia é o que o especialista vê sobre esse dia. Recalculada na leitura, a
-- nota mudaria depois de mostrada toda vez que a regra mudasse.
--
-- Base legal: Tutela da Saúde (Art. 11, II, f) + Consentimento (Art. 11, I), a
-- da tabela. A finalidade é nova — inferir recuperação vai além de guardar a
-- duração do sono —, então a `POLICY_VERSION` sobe para `1.7` e toda a base
-- reconsente. As colunas herdam a RLS da tabela, que consulta consentimento
-- (0043): revogar fecha o acesso do especialista à nota como fecha ao sono.

ALTER TABLE "health_daily_metrics"
  ADD COLUMN "readiness_score" smallint,
  ADD COLUMN "readiness_version" smallint;
--> statement-breakpoint

COMMENT ON COLUMN "health_daily_metrics"."readiness_score" IS
  'Prontidão do dia, 0 a 100 (ADR-0029). NULL = sem base de 3 dias ou sem leitura de sono e FC de repouso.';
--> statement-breakpoint

COMMENT ON COLUMN "health_daily_metrics"."readiness_version" IS
  'Versão da regra que calculou readiness_score. Nota de versões diferentes não se compara.';
--> statement-breakpoint

-- A nota sem versão é número sem régua: não dá para saber se 70 de março e 70 de
-- setembro dizem a mesma coisa. As duas nascem juntas ou não nascem.
ALTER TABLE "health_daily_metrics"
  ADD CONSTRAINT "health_daily_metrics_readiness_with_version"
  CHECK (num_nulls("readiness_score", "readiness_version") IN (0, 2));
--> statement-breakpoint

ALTER TABLE "health_daily_metrics"
  ADD CONSTRAINT "health_daily_metrics_readiness_score_range"
  CHECK ("readiness_score" IS NULL OR ("readiness_score" >= 0 AND "readiness_score" <= 100));
--> statement-breakpoint

ALTER TABLE "health_daily_metrics"
  ADD CONSTRAINT "health_daily_metrics_readiness_version_positive"
  CHECK ("readiness_version" IS NULL OR "readiness_version" >= 1);
