-- Separa cardio de musculação no banco, tira duração e calorias de dentro do
-- texto do aluno, e apaga duas colunas de `meal_logs` que nunca tiveram
-- caminho de escrita.
--
-- ── Por que `session_type` ────────────────────────────────────────────────────
--
-- Não existe tabela de cardio. `saveCardioSession` gravava em
-- `workout_sessions` apontando para uma linha sintética de `workouts` criada na
-- hora, com `title = 'Treino Cardio Livre'`. O único jeito de saber que uma
-- sessão era cardio era comparar essa string: bastava alguém renomear ou
-- traduzir para o app voltar a chamar corrida de musculação.
--
-- Tabela separada duplicaria `student_id`, `started_at`, `completed_at`,
-- `intensity` e `notes`, e obrigaria toda consulta de feed e de métricas a
-- fazer UNION. Do ponto de vista do produto as duas são a mesma coisa — uma
-- sessão que o aluno executou e avaliou. O que muda é o detalhe: cardio tem
-- duração e calorias, musculação tem séries em `workout_session_exercises`.
--
-- ── Por que a linha sintética de `workouts` é apagada, e não consertada ───────
--
-- Ela nascia com `specialist_id` = id do **aluno** — a coluna é o dono da
-- prescrição, e é o que a RLS da `0018` usa. O efeito era uma linha órfã por
-- aluno, aparecendo como biblioteca pessoal dele.
--
-- Consertar o dono manteria uma linha cuja única função era satisfazer o join
-- que dava o título. Com `session_type` na própria sessão, esse join não é mais
-- necessário: `workout_id` já é anulável (`ON DELETE SET NULL`, decidido para
-- preservar o histórico do aluno quando o especialista apaga a prescrição) e
-- `createWorkoutSession` já aceitava nulo. A ordem abaixo importa — o backfill
-- roda ANTES do DELETE, porque é a última vez que a string do título consegue
-- dizer o que a sessão foi.
--
-- ── O que não dá para recuperar ───────────────────────────────────────────────
--
-- Modalidade, duração e calorias das sessões de cardio antigas existem só
-- dentro da string gerada em `notes` (`'Corrida - 32min - 280kcal'`), e só
-- quando o aluno não escreveu nada — porque o código usava
-- `sessionData.notes || <string gerada>`, então qualquer observação do aluno
-- apagava os três.
--
-- Não há parser aqui de propósito: um parser de string gerada acerta a maioria
-- e erra em silêncio, e o resultado seria número inventado em coluna que o
-- especialista vai ler como medida. O texto fica onde está; as colunas novas
-- começam nulas para o passado e passam a ser preenchidas de verdade daqui
-- para frente.
--
-- ── Por que `meal_logs.photo_url` e `.notes` saem ─────────────────────────────
--
-- Nenhuma das duas tem caminho de escrita. `toggleMealLog` grava `completed`,
-- `updateMealLogItems` grava `actual_items`, e não existe tela onde o aluno
-- escreva sobre a refeição ou fotografe o prato. Não há bucket de foto de
-- refeição em migration nenhuma — o único bucket criado é `assessments`, na
-- `0021`, e é da avaliação física.
--
-- Vale palavra por palavra o que a `0026` registrou para `body_scans`:
--
--   Coluna que nunca deve ser preenchida não é neutra, é convite: enquanto ela
--   existir, alguém escreve nela sem saber que há uma decisão contrária, e aí
--   passamos a ter foto persistida sem bucket com política própria.
--
-- Foto de prato é dado pessoal com rosto, casa e companhia no enquadramento,
-- para uma informação que o registro de refeição já dá em texto. Guardar
-- exigiria bucket com política, URL assinada, retenção e eliminação: custo de
-- conformidade sem contrapartida.
--
-- Confirmado antes de rodar: `meal_logs` tem 4 linhas, nenhuma com `photo_url`
-- e nenhuma com `notes`. Valor ali seria incidente, não migration.
--
-- Escopo: isto vale para foto de refeição. A foto da avaliação física continua
-- como está — tem bucket com política desde a `0021` e parecer próprio no PRD
-- `body-scan-integrity`.

CREATE TYPE workout_session_type AS ENUM ('strength', 'cardio');

ALTER TABLE workout_sessions
  ADD COLUMN session_type workout_session_type NOT NULL DEFAULT 'strength',
  ADD COLUMN duration_seconds integer,
  ADD COLUMN active_calories integer,
  ADD COLUMN activity_name text;

-- `activity_name` existe porque a modalidade do cardio — "Corrida", "Bike",
-- "Caminhada" — não tinha onde morar. A linha sintética de `workouts` não a
-- guardava: o título dela era sempre 'Treino Cardio Livre', igual para todo
-- mundo. A modalidade só existia dentro da string gerada em `notes`, junto com
-- a duração e as calorias, e desaparecia quando o aluno escrevia qualquer
-- coisa. Fica nula na musculação, onde o nome vem da prescrição.

COMMENT ON COLUMN workout_sessions.notes IS
  'Texto livre do aluno sobre a própria sessão. Dado sensível de saúde (Art. 11 '
  'da LGPD) — ver seção 2.2 de docs/LGPD_COMPLIANCE.md. Nunca receber texto '
  'gerado pelo app: até a 0035 o cardio escrevia aqui um resumo de duração e '
  'calorias, e não havia como saber se uma linha era relato do titular ou '
  'string do sistema.';

COMMENT ON COLUMN workout_sessions.duration_seconds IS
  'Duração medida da sessão. Preenchida pelo cardio; nula na musculação, onde a '
  'duração sai de started_at/completed_at.';

-- Backfill: última leitura possível do título sintético.
UPDATE workout_sessions s
   SET session_type = 'cardio'
  FROM workouts w
 WHERE s.workout_id = w.id
   AND w.title = 'Treino Cardio Livre';

-- A sessão de cardio deixa de apontar para a prescrição fantasma. `session_type`
-- já carrega o que o join dava.
UPDATE workout_sessions
   SET workout_id = NULL
 WHERE session_type = 'cardio';

DELETE FROM workouts WHERE title = 'Treino Cardio Livre';

ALTER TABLE meal_logs
  DROP COLUMN IF EXISTS photo_url,
  DROP COLUMN IF EXISTS notes;
