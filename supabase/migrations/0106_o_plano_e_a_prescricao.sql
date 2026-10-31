-- O plano de séries passa a ser a prescrição inteira do item (#431, fatia 5):
-- saem `sets`, `reps`, `weight` e `rest_seconds`, e `set_plan` fica obrigatório.
--
-- ORDEM DE DEPLOY — esta migration não tem volta e quebra o app antigo:
--   1. O app com as fatias 3 e 5 publicado e adotado. A versão anterior lê
--      `sets` e `reps` do item e mostraria zero séries sem eles.
--   2. `npm run db:backfill-set-plan` no ambiente, logo antes desta migration:
--      preenche o plano de quem ainda não tem, com a conversão testada do
--      shared, e leva o texto que não coube para a observação.
--   3. Esta migration. Ela recusa rodar enquanto houver item sem plano, para a
--      queda das colunas nunca levar prescrição junto.
--
-- O default `[]` é para INSERT que não passa pelo serviço (scripts, travas do
-- verify-rls); o serviço sempre manda o plano conferido.

DO $$
DECLARE
  sem_plano integer;
BEGIN
  SELECT count(*) INTO sem_plano FROM public.workout_exercises WHERE set_plan IS NULL;
  IF sem_plano > 0 THEN
    RAISE EXCEPTION
      'PRESCRIÇÃO SERIA PERDIDA: % itens de treino ainda sem set_plan. Rode npm run db:backfill-set-plan neste ambiente antes da 0106.',
      sem_plano;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "workout_exercises" DROP CONSTRAINT "workout_exercises_set_plan_shape";
--> statement-breakpoint
ALTER TABLE "workout_exercises" ALTER COLUMN "set_plan" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "workout_exercises" ALTER COLUMN "set_plan" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "workout_exercises"
  ADD CONSTRAINT "workout_exercises_set_plan_shape"
    CHECK (jsonb_typeof("set_plan") = 'array' AND jsonb_array_length("set_plan") <= 20);
--> statement-breakpoint

ALTER TABLE "workout_exercises" DROP COLUMN "sets";
--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "reps";
--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "weight";
--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "rest_seconds";
