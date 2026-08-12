-- Apaga `workout_session_exercises.sets_data`.
--
-- A coluna guardava a sessão inteira de um exercício num JSON. A `0007` criou
-- `workout_session_sets` normalizada justamente porque o JSONB inviabiliza
-- query analítica, e deixou escrito que a coluna sairia "em migration futura
-- após confirmar que não há dados em produção".
--
-- Não há produção — o projeto está em construção. E deprecar não bastou: duas
-- telas do mobile continuaram gravando no caminho antigo, então a evolução do
-- aluno enxergava a sessão ou não dependendo de por qual tela ele treinou.
-- Enquanto a coluna existir, o caminho antigo compila e alguém volta a usá-lo.

ALTER TABLE workout_session_exercises DROP COLUMN IF EXISTS sets_data;
