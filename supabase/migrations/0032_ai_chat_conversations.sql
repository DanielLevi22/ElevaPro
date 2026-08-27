-- Prepara `ai_chat_sessions` para várias conversas por aluno.
--
-- A tabela já modelava isso: nada impedia duas linhas com o mesmo
-- `student_id` + `specialist_id` + `module`. O que forçava uma só era o
-- `getOrCreateSession`, que devolvia sempre a mais recente. Faltavam duas
-- colunas para a lista existir.
--
-- `title` — sem ele a lista vira dez "Conversa de 14/08" e o especialista
-- volta a usar uma só. Nulável: a conversa nasce sem título e ganha um depois
-- das primeiras mensagens.
--
-- `archived_at` — arquivar tira da lista sem apagar. Apagar não é opção:
-- conversa com o coach é registro de prescrição assistida, e a seção 7 do
-- LGPD_COMPLIANCE declara retenção enquanto a conta existir. E é o
-- arquivamento que impede a feature de só multiplicar histórico de saúde
-- guardado (Art. 6°, III).

ALTER TABLE ai_chat_sessions
  ADD COLUMN IF NOT EXISTS title       text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- A lista é sempre "conversas não arquivadas deste aluno com este
-- especialista, mais recente primeiro". Sem o índice, cada abertura do chat
-- varre a tabela inteira.
CREATE INDEX IF NOT EXISTS ai_chat_sessions_ativas_idx
  ON ai_chat_sessions (student_id, specialist_id, updated_at DESC)
  WHERE archived_at IS NULL;

COMMENT ON COLUMN ai_chat_sessions.archived_at IS
  'Arquivada: sai da lista, permanece no banco. Registro de prescrição assistida não se apaga.';
