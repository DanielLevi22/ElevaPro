-- Onda 1 do relógio: sono e frequência cardíaca de repouso.
--
-- Duas colunas, e a lista pedida tinha vinte. O corte é o parecer da #225:
--
--   sleep_minutes        duração total do sono da noite
--   resting_heart_rate   FC de repouso do dia
--
-- **Fora, com motivo.** Horário de dormir e de acordar revelam rotina
-- doméstica e não mudam prescrição — mesma razão pela qual `birth_date` e
-- `phone` ficaram fora de `profiles`. Estágios (leve/profundo/REM) entram
-- quando existir a leitura que os consome; hoje não existe, e "pode ser útil no
-- futuro" é critério explicitamente rejeitado pela `LGPD_COMPLIANCE.md` §2.3.
-- Pressão arterial, SpO2 e temperatura não entram porque nenhum relógio de
-- consumo as alimenta de forma confiável — o campo existiria vazio.
--
-- Base legal: Tutela da Saúde (Art. 11, II, f) + Consentimento (Art. 11, I).
-- Finalidade **nova** em relação a passos e calorias, que existem para
-- "acompanhamento de atividade entre sessões": sono é comportamento fora do
-- treino e FC de repouso é sinal vital. Por isso a `POLICY_VERSION` sobe para
-- `1.3` e toda a base reconsente — mesmo `consent_type`, porque continua sendo
-- coleta de dado de saúde para acompanhamento, ao contrário da Análise de
-- Técnica, que ganhou tipo próprio na `0041` por ser outra natureza.
--
-- Minimização: uma linha por dia, como passos e calorias. A série intradiária
-- de batimentos permitiria inferir estresse, atividade sexual e crise de
-- ansiedade — muito além de acompanhar treino.

ALTER TABLE "health_daily_metrics"
  ADD COLUMN "sleep_minutes" integer,
  ADD COLUMN "resting_heart_rate" integer;
--> statement-breakpoint

-- Nulo é ausência de leitura, não zero. Dormir zero minuto e não ter dado de
-- sono são coisas diferentes, e a `0015` já aprendeu isso com `hasRecords`: o
-- que o app grava quando não leu nada precisa ser distinguível do que ele grava
-- quando leu de verdade. Por isso estas duas são NULL-áveis, ao contrário de
-- `steps` e `active_calories`, que nascem com DEFAULT 0.
COMMENT ON COLUMN "health_daily_metrics"."sleep_minutes" IS
  'Duração total do sono em minutos. NULL = sem leitura no dia, nunca zero.';
--> statement-breakpoint

COMMENT ON COLUMN "health_daily_metrics"."resting_heart_rate" IS
  'FC de repouso em bpm. NULL = sem leitura no dia.';
--> statement-breakpoint

-- Faixas de plausibilidade fisiológica. Existem para barrar erro de unidade,
-- que é a falha real deste caminho: HealthKit e Health Connect devolvem sono em
-- unidades diferentes, e um valor em segundos gravado como minutos passaria
-- despercebido para sempre — vira "o aluno dormiu 8 dias".
ALTER TABLE "health_daily_metrics"
  ADD CONSTRAINT "health_daily_metrics_sleep_minutes_plausible"
  CHECK ("sleep_minutes" IS NULL OR ("sleep_minutes" >= 0 AND "sleep_minutes" <= 1440));
--> statement-breakpoint

-- 20 bpm é abaixo do atleta de endurance mais bradicárdico; 200 é acima da FC
-- máxima de qualquer adulto. Fora disso é defeito de leitura, não pessoa.
ALTER TABLE "health_daily_metrics"
  ADD CONSTRAINT "health_daily_metrics_resting_hr_plausible"
  CHECK ("resting_heart_rate" IS NULL OR ("resting_heart_rate" >= 20 AND "resting_heart_rate" <= 200));
