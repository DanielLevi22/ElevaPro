-- RLS fase 3 — prescrição e catálogo.
--
-- Aqui a direção do dado se inverte: quem escreve é o specialist, quem lê é o
-- aluno vinculado. Treino, fase e periodização são prescrição, não execução.

-- ── training_periodizations ──────────────────────────────────────────────────

ALTER TABLE training_periodizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periodizations_specialist_manage" ON training_periodizations
  FOR ALL USING (specialist_id = (SELECT auth.uid()))
  WITH CHECK (specialist_id = (SELECT auth.uid()));

CREATE POLICY "periodizations_student_read" ON training_periodizations
  FOR SELECT USING (student_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS periodizations_specialist_idx
  ON training_periodizations (specialist_id);
CREATE INDEX IF NOT EXISTS periodizations_student_idx
  ON training_periodizations (student_id);

-- ── training_plans (fases) ───────────────────────────────────────────────────
-- Acesso derivado da periodização dona.

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_access" ON training_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM training_periodizations tp
      WHERE tp.id = training_plans.periodization_id
        AND tp.specialist_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_periodizations tp
      WHERE tp.id = training_plans.periodization_id
        AND tp.specialist_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "plans_student_read" ON training_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_periodizations tp
      WHERE tp.id = training_plans.periodization_id
        AND tp.student_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS training_plans_periodization_idx
  ON training_plans (periodization_id);

-- ── workouts ─────────────────────────────────────────────────────────────────
-- `workouts` tem specialist_id e student_id próprios, então não depende da fase.

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workouts_specialist_manage" ON workouts
  FOR ALL USING (specialist_id = (SELECT auth.uid()))
  WITH CHECK (specialist_id = (SELECT auth.uid()));

CREATE POLICY "workouts_student_read" ON workouts
  FOR SELECT USING (
    student_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM training_plans tpl
      JOIN training_periodizations tp ON tp.id = tpl.periodization_id
      WHERE tpl.id = workouts.training_plan_id
        AND tp.student_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS workouts_specialist_idx ON workouts (specialist_id);
CREATE INDEX IF NOT EXISTS workouts_plan_idx ON workouts (training_plan_id);

-- ── workout_exercises (prescrição dentro do treino) ──────────────────────────

ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_exercises_access" ON workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_exercises.workout_id
        AND w.specialist_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_exercises.workout_id
        AND w.specialist_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "workout_exercises_student_read" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_exercises.workout_id
        AND w.student_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS workout_exercises_workout_idx
  ON workout_exercises (workout_id);

-- ── exercises (catálogo) ─────────────────────────────────────────────────────
-- Mesmo padrão de `foods` na 0013: leitura para todos, escrita só de quem criou.
-- Catálogo é dado de produto, não dado pessoal.

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_read_all" ON exercises
  FOR SELECT USING (true);

CREATE POLICY "exercises_insert_own" ON exercises
  FOR INSERT WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "exercises_update_own" ON exercises
  FOR UPDATE USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "exercises_delete_own" ON exercises
  FOR DELETE USING (created_by = (SELECT auth.uid()));

-- ── specialist_services ──────────────────────────────────────────────────────
-- O aluno precisa ler para saber que serviço o specialist oferece.

ALTER TABLE specialist_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_own_manage" ON specialist_services
  FOR ALL USING (specialist_id = (SELECT auth.uid()))
  WITH CHECK (specialist_id = (SELECT auth.uid()));

CREATE POLICY "services_student_read" ON specialist_services
  FOR SELECT USING ((SELECT private.is_my_specialist(specialist_id)));

CREATE INDEX IF NOT EXISTS specialist_services_specialist_idx
  ON specialist_services (specialist_id);
