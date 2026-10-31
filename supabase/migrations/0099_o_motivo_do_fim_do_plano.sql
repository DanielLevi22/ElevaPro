-- Por que um plano foi encerrado (#376): "encerrar, nunca apagar". O bloco que
-- acaba fica `completed` (treino) ou `finished` (dieta) com o motivo, e o
-- próximo começa; o histórico de blocos e "seu plano mudou N vezes" leem daqui.
--
-- Execução de contrato (Art. 7°, V): é o ciclo de vida do plano, não condição
-- de saúde. Os motivos ligados a saúde (lesão, por exemplo) entram com a fatia
-- que os pedir, com nova revisão LGPD. Gravado pelo BFF ao aprovar o próximo
-- bloco; o aluno não tem política de escrita em periodização.
ALTER TABLE "training_periodizations"
  ADD COLUMN "end_reason" text,
  ADD CONSTRAINT "training_periodizations_end_reason"
    CHECK ("end_reason" IN ('block_completed', 'replaced'));
--> statement-breakpoint

ALTER TABLE "diet_plans"
  ADD COLUMN "end_reason" text,
  ADD CONSTRAINT "diet_plans_end_reason"
    CHECK ("end_reason" IN ('block_completed', 'replaced'));
--> statement-breakpoint

COMMENT ON COLUMN "training_periodizations"."end_reason" IS
  'Por que o plano foi encerrado: block_completed (fim do bloco) ou replaced (trocado por outro). Nulo enquanto ativo. Execução de contrato (Art. 7°, V) (#376).';
--> statement-breakpoint

COMMENT ON COLUMN "diet_plans"."end_reason" IS
  'Por que a dieta foi encerrada: block_completed (fim do bloco) ou replaced (trocada por outra). Nulo enquanto ativa. Execução de contrato (Art. 7°, V) (#376).';
