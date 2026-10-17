-- O plano trocado antes do fim do bloco (#376, C2): mudou o objetivo, os dias,
-- o local ou surgiu uma dor. O bloco fecha hoje com `changed_early`, e o novo
-- começa amanhã — encerrar, nunca apagar.
--
-- Um motivo só, e não qual mudança: "tenho dor ou lesão" gravado no plano
-- seria dado de saúde (Art. 11) fora da anamnese, que é onde ele já mora com
-- consentimento. O histórico diz "encerrado antes"; o porquê está na anamnese.
ALTER TABLE "training_periodizations"
  DROP CONSTRAINT "training_periodizations_end_reason",
  ADD CONSTRAINT "training_periodizations_end_reason"
    CHECK ("end_reason" IN ('block_completed', 'replaced', 'changed_early'));
--> statement-breakpoint

ALTER TABLE "diet_plans"
  DROP CONSTRAINT "diet_plans_end_reason",
  ADD CONSTRAINT "diet_plans_end_reason"
    CHECK ("end_reason" IN ('block_completed', 'replaced', 'changed_early'));
--> statement-breakpoint

COMMENT ON COLUMN "training_periodizations"."end_reason" IS
  'Por que o plano foi encerrado: block_completed (fim do bloco), replaced (trocado por outro) ou changed_early (mudado antes do fim). Nulo enquanto ativo. Execução de contrato (Art. 7°, V) (#376).';
--> statement-breakpoint

COMMENT ON COLUMN "diet_plans"."end_reason" IS
  'Por que a dieta foi encerrada: block_completed, replaced ou changed_early. Nulo enquanto ativa. Execução de contrato (Art. 7°, V) (#376).';
