-- O preparo da refeição: tempo, dificuldade e porções.
--
-- Issue #298. O kit mostra "25 min · Fácil · 1 porção" no detalhe da refeição
-- do aluno, e o dado não existia. Quem informa é o especialista, no editor do
-- plano do web: é metadado de receita, e não dado sobre o titular — fica sob a
-- RLS de `diet_meals` (0013), que já decide quem lê e escreve o plano.
--
-- As três nascem nulas e seguem opcionais: plano antigo não tem a informação, e
-- inventar um tempo de preparo seria pior que não mostrar. Sem valor, a tela do
-- aluno esconde a linha.

ALTER TABLE "diet_meals"
  ADD COLUMN "prep_minutes" integer,
  ADD COLUMN "difficulty" text,
  ADD COLUMN "servings" integer;
--> statement-breakpoint

-- De 1 minuto a 10 horas: fora disso é erro de digitação, e não receita.
ALTER TABLE "diet_meals"
  ADD CONSTRAINT "diet_meals_prep_minutes_plausible"
  CHECK ("prep_minutes" IS NULL OR ("prep_minutes" >= 1 AND "prep_minutes" <= 600));
--> statement-breakpoint

-- Três níveis, como o kit. Texto com CHECK, e não enum: acrescentar um nível
-- depois é trocar o CHECK, sem a dança de `ALTER TYPE` em transação.
ALTER TABLE "diet_meals"
  ADD CONSTRAINT "diet_meals_difficulty_known"
  CHECK ("difficulty" IS NULL OR "difficulty" IN ('facil', 'media', 'dificil'));
--> statement-breakpoint

ALTER TABLE "diet_meals"
  ADD CONSTRAINT "diet_meals_servings_plausible"
  CHECK ("servings" IS NULL OR ("servings" >= 1 AND "servings" <= 20));
--> statement-breakpoint

COMMENT ON COLUMN "diet_meals"."prep_minutes" IS 'Tempo de preparo em minutos, informado pelo especialista. NULL = não informado.';
--> statement-breakpoint
COMMENT ON COLUMN "diet_meals"."difficulty" IS 'facil | media | dificil. NULL = não informado.';
--> statement-breakpoint
COMMENT ON COLUMN "diet_meals"."servings" IS 'Porções que a receita rende. NULL = não informado.';
