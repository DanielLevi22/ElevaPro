-- A série feita sabe se conta no volume (#431). Aquecimento e preparação não
-- contam no volume do histórico nem dos gráficos, mas a prescrição pode mudar
-- depois do treino: o tipo é gravado com a série, no momento em que ela foi
-- feita, e não deduzido do plano atual.
--
-- O `/lgpd-check` classificou como execução de contrato: é metadado da
-- prescrição, não dado de saúde. Sem política nova — herda as de
-- `workout_session_sets`. Série antiga conta, como sempre contou.

ALTER TABLE "workout_session_sets"
  ADD COLUMN "counts_toward_volume" boolean NOT NULL DEFAULT true;
