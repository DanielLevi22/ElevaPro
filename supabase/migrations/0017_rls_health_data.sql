-- RLS fase 2 — dado de saúde.
--
-- Padrão já validado em meal_logs (0013) e health_daily_metrics (0015): o dono
-- tem tudo, o specialist tem SELECT e só com vínculo ativo. Desvinculou, perde
-- acesso na mesma consulta — sem job de limpeza, sem janela de exposição.
--
-- O specialist não escreve dado de execução no lugar do aluno: quem treinou foi
-- o aluno, e deixar outro escrever ali corrompe a proveniência do dado.

-- ── student_anamnesis ────────────────────────────────────────────────────────
-- Base legal: Consentimento Explícito (Art. 11, I). Era a tabela mais exposta
-- do sistema — 3 anamneses lidas por um usuário sem vínculo no teste.

ALTER TABLE student_anamnesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anamnesis_own" ON student_anamnesis
  FOR ALL USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY "anamnesis_specialist_read" ON student_anamnesis
  FOR SELECT USING ((SELECT private.is_linked_specialist(student_id)));

-- ── physical_assessments ─────────────────────────────────────────────────────
-- Aqui o specialist escreve: a avaliação física é feita por ele, não pelo aluno.
--
-- Mas só INSERT. O LGPD_COMPLIANCE (seção 10, módulo Students) registra a
-- avaliação como imutável — "nunca UPDATE", pelo princípio da qualidade do
-- dado: corrigir uma medida antiga reescreve o histórico clínico do aluno.
-- Medida errada se corrige com avaliação nova, que é o que o histórico mostra.

ALTER TABLE physical_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessments_student_read" ON physical_assessments
  FOR SELECT USING (student_id = (SELECT auth.uid()));

CREATE POLICY "assessments_specialist_read" ON physical_assessments
  FOR SELECT USING ((SELECT private.is_linked_specialist(student_id)));

CREATE POLICY "assessments_specialist_insert" ON physical_assessments
  FOR INSERT WITH CHECK ((SELECT private.is_linked_specialist(student_id)));

-- Sem UPDATE e sem DELETE, de propósito. A rota /api/students/[id] ainda faz
-- UPDATE, mas pelo service_role, que ignora RLS — é dívida registrada, não
-- permissão concedida ao cliente.

CREATE INDEX IF NOT EXISTS physical_assessments_student_idx
  ON physical_assessments (student_id);

-- ── body_scans ───────────────────────────────────────────────────────────────
-- Guarda URL de foto corporal (frente, costas, laterais) mais peso, % de
-- gordura e massa muscular. É o dado mais sensível do schema.
--
-- Atenção: RLS aqui protege a LINHA, não o arquivo. As URLs apontam para o
-- Storage, que tem política própria — registrado como dívida no STATUS.

ALTER TABLE body_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "body_scans_own" ON body_scans
  FOR ALL USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY "body_scans_specialist_read" ON body_scans
  FOR SELECT USING ((SELECT private.is_linked_specialist(student_id)));

CREATE INDEX IF NOT EXISTS body_scans_student_idx ON body_scans (student_id);

-- ── workout_sessions ─────────────────────────────────────────────────────────

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_own" ON workout_sessions
  FOR ALL USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY "sessions_specialist_read" ON workout_sessions
  FOR SELECT USING ((SELECT private.is_linked_specialist(student_id)));

CREATE INDEX IF NOT EXISTS workout_sessions_student_completed_idx
  ON workout_sessions (student_id, completed_at DESC);

-- ── workout_session_exercises ────────────────────────────────────────────────
-- Acesso derivado da sessão dona.

ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_exercises_own" ON workout_session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_session_exercises.session_id
        AND ws.student_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_session_exercises.session_id
        AND ws.student_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "session_exercises_specialist_read" ON workout_session_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_session_exercises.session_id
        AND (SELECT private.is_linked_specialist(ws.student_id))
    )
  );

CREATE INDEX IF NOT EXISTS workout_session_exercises_session_idx
  ON workout_session_exercises (session_id);

-- ── workout_session_sets ─────────────────────────────────────────────────────
-- Já tinha RLS desde a 0007, mas só do aluno. O specialist não lia a carga
-- executada dos próprios alunos, então qualquer métrica de evolução ou recorde
-- voltava vazia — sem erro, o que é pior que falhar.

CREATE POLICY "sets_specialist_read" ON workout_session_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_session_exercises wse
      JOIN workout_sessions ws ON ws.id = wse.session_id
      WHERE wse.id = workout_session_sets.session_exercise_id
        AND (SELECT private.is_linked_specialist(ws.student_id))
    )
  );

CREATE INDEX IF NOT EXISTS workout_session_sets_exercise_idx
  ON workout_session_sets (session_exercise_id);
