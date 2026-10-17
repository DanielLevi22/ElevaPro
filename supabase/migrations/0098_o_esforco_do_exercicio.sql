-- O esforço de cada exercício, respondido depois da última série (#376, A2).
--
-- A série é gravada com a repetição da prescrição, e não com a feita: a carga
-- do próximo treino não tinha sinal nenhum para subir ou descer. "Fácil",
-- "Ok" ou "Difícil" é esse sinal; a regra que o lê mora no código
-- (`suggestedLoad`), e a carga sugerida não é gravada: sai da última sessão.
--
-- Execução de contrato (Art. 7°, V), como a PSE da sessão: é a percepção do
-- próprio treino, não condição de saúde. Herda a RLS da tabela: o aluno grava
-- a sua; o especialista com vínculo ativo lê.
ALTER TABLE "workout_session_exercises"
  ADD COLUMN "effort" text,
  ADD CONSTRAINT "workout_session_exercises_effort" CHECK ("effort" IN ('easy', 'ok', 'hard'));
--> statement-breakpoint

COMMENT ON COLUMN "workout_session_exercises"."effort" IS
  'Como o aluno sentiu o exercício: easy, ok ou hard; nulo quando pulou a pergunta. Execução de contrato (Art. 7°, V). Lê a sugestão de carga do próximo treino (#376).';
