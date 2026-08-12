-- Plano alimentar sem período derruba a tela de detalhe.
--
-- `DietDetailsHeader` faz `format(new Date(dietPlan.start_date ?? ""))`, e
-- `new Date("")` é Invalid Date: o `format` do date-fns **lança** RangeError,
-- diferente do `toLocaleDateString`, que devolveria "Invalid Date" sem barulho.
-- É a mesma armadilha registrada no STATUS depois do incidente das
-- periodizações com data de cinco dígitos.
--
-- Mesma decisão da 0024, pelo mesmo motivo: dieta sem período não entra no
-- calendário do aluno, e o banco passa a recusar em vez de deixar a tela
-- descobrir em produção.

UPDATE diet_plans
   SET start_date = COALESCE(start_date, created_at::date, CURRENT_DATE)
 WHERE start_date IS NULL;

-- Oito semanas quando não há nada melhor: é o ciclo mais comum de dieta, e uma
-- data plausível vale mais que uma linha que quebra a tela.
UPDATE diet_plans
   SET end_date = start_date + 56
 WHERE end_date IS NULL;

ALTER TABLE diet_plans
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date   SET NOT NULL;

ALTER TABLE diet_plans
  ADD CONSTRAINT diet_plans_periodo_valido CHECK (end_date >= start_date);
