-- O aluno voltou a enxergar os exercícios do treino prescrito.
--
-- `workouts` ganhou `student_id` na 0012, para o member que cria treino para si
-- mesmo. Num treino que o especialista prescreve dentro de uma fase esse campo
-- é NULL: o vínculo com o aluno passa por
-- `training_plans → training_periodizations.student_id`.
--
-- A 0018 escreveu duas políticas e só uma soube disso. `workouts_student_read`
-- conhece os dois caminhos; `workout_exercises_student_read` ficou só com o do
-- member. O aluno passava pela primeira e era barrado pela segunda — daí a
-- forma exata do sintoma: o treino abria e a lista de exercícios vinha vazia.
--
-- Provado no banco local antes desta migration: 1 workout visível, 0
-- workout_exercises, com o JWT do aluno dono da periodização.
--
-- Não dá para delegar isto a um `EXISTS` que se apoie na política de
-- `workouts`: a subconsulta dentro de uma policy roda sem aplicar a policy da
-- tabela consultada. A regra é reescrita de propósito, e a duplicação é o preço.

DROP POLICY IF EXISTS "workout_exercises_student_read" ON workout_exercises;

CREATE POLICY "workout_exercises_student_read" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_exercises.workout_id
        AND (
          -- treino que o próprio member criou
          w.student_id = (SELECT auth.uid())
          -- treino prescrito dentro de uma fase da periodização deste aluno
          OR EXISTS (
            SELECT 1 FROM training_plans tpl
            JOIN training_periodizations tp ON tp.id = tpl.periodization_id
            WHERE tpl.id = w.training_plan_id
              AND tp.student_id = (SELECT auth.uid())
          )
        )
    )
  );

-- O EXISTS aninhado percorre fase → periodização a cada linha lida. Sem este
-- índice, um treino de 12 exercícios faz 12 varreduras sequenciais em
-- `training_plans`.
CREATE INDEX IF NOT EXISTS training_plans_periodization_student_idx
  ON training_plans (id, periodization_id);
