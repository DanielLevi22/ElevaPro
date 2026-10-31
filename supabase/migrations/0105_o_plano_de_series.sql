-- O plano de séries do exercício prescrito (#431, fatia 1): as séries uma a
-- uma, com técnicas, repetições, peso, descanso, RIR alvo e segmentos, numa
-- coluna JSONB do próprio `workout_exercises`.
--
-- JSONB e não tabela: o plano é sempre lido e gravado inteiro, e ninguém
-- consulta série solta entre treinos — o que precisa de consulta vem da
-- execução, que já é normalizada em `workout_session_sets`. Assim a RLS de
-- `workout_exercises` cobre o plano sem política nova.
--
-- A coluna nasce nula e a migração não converte nada: plano nulo quer dizer
-- "derive do formato achatado", e quem faz isso é o `resolveSetPlan` do
-- shared. Converter aqui duplicaria em SQL a leitura de texto livre ("8 a 12",
-- "corporal") que o TypeScript já faz e testa. A conversão definitiva roda na
-- fatia 5, antes de apagar `sets`, `reps`, `weight` e `rest_seconds`.
--
-- O formato fino (campos, técnicas do catálogo, limites por série) é do schema
-- compartilhado, que é estrito. O banco garante o mínimo que não depende de
-- versão de código: lista, com até 20 séries. O `/lgpd-check` da fatia 1
-- classificou o plano como prescrição (Art. 7°, V), não dado de saúde.

ALTER TABLE "workout_exercises" ADD COLUMN "set_plan" jsonb;
--> statement-breakpoint

ALTER TABLE "workout_exercises"
  ADD CONSTRAINT "workout_exercises_set_plan_shape"
    CHECK (
      "set_plan" IS NULL
      OR (jsonb_typeof("set_plan") = 'array' AND jsonb_array_length("set_plan") <= 20)
    );
