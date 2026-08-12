-- RLS fase 4 — gamificação.
--
-- Base legal: Execução de Contrato (Art. 7°, V). Não é dado de saúde, mas é
-- dado pessoal e revela rotina — quantos dias seguidos alguém treinou diz onde
-- a pessoa esteve. Mesmo padrão das demais: dono tem tudo, specialist vinculado
-- lê.

-- ── achievements ─────────────────────────────────────────────────────────────

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_own" ON achievements
  FOR ALL USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY "achievements_specialist_read" ON achievements
  FOR SELECT USING ((SELECT private.is_linked_specialist(student_id)));

CREATE INDEX IF NOT EXISTS achievements_student_idx ON achievements (student_id);

-- ── daily_goals ──────────────────────────────────────────────────────────────

ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_goals_own" ON daily_goals
  FOR ALL USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY "daily_goals_specialist_read" ON daily_goals
  FOR SELECT USING ((SELECT private.is_linked_specialist(student_id)));

CREATE INDEX IF NOT EXISTS daily_goals_student_idx ON daily_goals (student_id);

-- ── student_streaks ──────────────────────────────────────────────────────────

ALTER TABLE student_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streaks_own" ON student_streaks
  FOR ALL USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE POLICY "streaks_specialist_read" ON student_streaks
  FOR SELECT USING ((SELECT private.is_linked_specialist(student_id)));

CREATE INDEX IF NOT EXISTS student_streaks_student_idx ON student_streaks (student_id);
