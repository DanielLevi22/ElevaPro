-- Periodização e fase sem data não conseguem ser colocadas num calendário, e a
-- tela mostra esse campo: `PeriodizationsTable` e `PeriodizationDetailsPage`
-- chamam `formatDateRange(start_date, end_date)`.
--
-- O formulário manual já exigia as duas datas — `CreateTrainingPlanModal` tem
-- `required` nos dois campos e recusa o envio sem eles. Quem criava linha sem
-- data era só o coach de IA, que não pedia e não gravava. Verificado em
-- 2026-08-12: periodização e as três fases saíram com `start_date: null`.
--
-- Deixar nullable é aceitar que metade das periodizações não tenha calendário.
-- O banco passa a recusar.

-- ── Preenche o que já existe ─────────────────────────────────────────────────
--
-- Periodização sem início assume hoje; sem fim, soma a duração declarada, e 12
-- semanas quando nem isso existe. É uma data plausível para um registro que
-- hoje não tem nenhuma — não pretende ser a verdade histórica.

UPDATE training_periodizations
   SET start_date = COALESCE(start_date, created_at::date, CURRENT_DATE)
 WHERE start_date IS NULL;

UPDATE training_periodizations
   SET end_date = start_date + (COALESCE(duration_weeks, 12) * 7)
 WHERE end_date IS NULL;

-- As fases se encaixam em sequência dentro da periodização, na ordem de
-- `order_index`: cada uma começa onde a anterior terminou. É a mesma regra que
-- o coach passa a usar ao propor.
WITH janelas AS (
  SELECT
    tp.id,
    -- `SUM` devolve bigint e não existe `date + bigint`; o cast é obrigatório.
    per.start_date
      + (COALESCE(
           SUM(COALESCE(anteriores.duration_weeks, 4)) FILTER (
             WHERE anteriores.order_index < tp.order_index
           ), 0
         )::int * 7) AS inicio,
    COALESCE(tp.duration_weeks, 4) AS semanas
  FROM training_plans tp
  JOIN training_periodizations per ON per.id = tp.periodization_id
  LEFT JOIN training_plans anteriores ON anteriores.periodization_id = tp.periodization_id
  WHERE tp.start_date IS NULL OR tp.end_date IS NULL
  GROUP BY tp.id, per.start_date, tp.duration_weeks
)
UPDATE training_plans tp
   SET start_date = COALESCE(tp.start_date, j.inicio),
       end_date   = COALESCE(tp.end_date, j.inicio + (j.semanas * 7))
  FROM janelas j
 WHERE tp.id = j.id;

-- Sobrou alguma sem periodização com data? Não deveria, mas NOT NULL não
-- perdoa: o fallback evita que a migration trave num caso de borda.
UPDATE training_plans
   SET start_date = COALESCE(start_date, CURRENT_DATE),
       end_date   = COALESCE(end_date, CURRENT_DATE + (COALESCE(duration_weeks, 4) * 7))
 WHERE start_date IS NULL OR end_date IS NULL;

-- ── Trava ────────────────────────────────────────────────────────────────────

ALTER TABLE training_periodizations
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date   SET NOT NULL;

ALTER TABLE training_plans
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date   SET NOT NULL;

-- Fim antes do início é sempre erro de quem escreveu, e o calendário fica
-- ilegível sem barulho nenhum.
ALTER TABLE training_periodizations
  ADD CONSTRAINT training_periodizations_periodo_valido CHECK (end_date >= start_date);

ALTER TABLE training_plans
  ADD CONSTRAINT training_plans_periodo_valido CHECK (end_date >= start_date);
