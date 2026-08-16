-- Cria `student_anamnesis.updated_at`.
--
-- O mobile manda essa coluna no upsert desde sempre. Ela não existe, então
-- **todo salvamento de anamnese pelo app falha** com 42703. Reproduzido no
-- banco local em 2026-08-12: o insert com `updated_at` é recusado.
--
-- O sintoma não é "erro ao salvar": é a tela do especialista no web abrindo
-- vazia, porque nunca chegou dado. A causa está a duas plataformas de
-- distância de onde ela aparece.
--
-- A coluna entra em vez de sair do código porque ela é genuinamente
-- necessária: a anamnese é reescrita ao longo do tempo (upsert por
-- `student_id`), e dado declarado envelhece de um jeito que dado medido não
-- envelhece. Uma avaliação de março continua sendo verdade sobre março; um
-- "peso 82 kg" declarado em março vira mentira sobre hoje sem ninguém tocar
-- nele. Sem `updated_at` não há como a tela dizer há quanto tempo aquilo foi
-- informado.
--
-- Mesmo tipo e default de `ai_chat_sessions`, `training_periodizations` e
-- `workouts`, que já usam a coluna.

ALTER TABLE student_anamnesis
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN student_anamnesis.updated_at IS
  'Quando a anamnese foi respondida ou revista. Dado declarado envelhece — a tela precisa poder dizer há quanto tempo.';
