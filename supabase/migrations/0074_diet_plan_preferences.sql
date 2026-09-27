-- Preferências do plano de dieta (#337).
--
-- Fazem parte da prescrição: o que o plano exclui e como ele se distribui na
-- semana. Ficam sob a RLS de `diet_plans` (0073), e a base legal é a do plano
-- (Art. 11, II, f + I — LGPD_COMPLIANCE.md §2.2).
--
-- `dietary_restrictions` é vocabulário fechado de EXCLUSÃO DE ALIMENTO, com
-- CHECK no banco: a anamnese oferece "Diabetes" e "Outra" na mesma pergunta, e
-- copiar a resposta como está levaria um diagnóstico para uma segunda tabela,
-- sob outra política de acesso. Diagnóstico continua só na anamnese.

ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS dietary_restrictions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meals_per_day integer,
  ADD COLUMN IF NOT EXISTS allows_supplements boolean,
  ADD COLUMN IF NOT EXISTS free_meal_days integer[] NOT NULL DEFAULT '{}';
--> statement-breakpoint

ALTER TABLE public.diet_plans
  ADD CONSTRAINT diet_plans_dietary_restrictions_vocabulary
    CHECK (dietary_restrictions <@ ARRAY['lactose_free', 'gluten_free', 'vegetarian', 'vegan']::text[]),
  ADD CONSTRAINT diet_plans_meals_per_day_range
    CHECK (meals_per_day IS NULL OR meals_per_day BETWEEN 1 AND 8),
  ADD CONSTRAINT diet_plans_free_meal_days_weekdays
    CHECK (free_meal_days <@ ARRAY[0, 1, 2, 3, 4, 5, 6]);
