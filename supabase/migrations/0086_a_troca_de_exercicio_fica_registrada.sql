-- A troca de exercício do aluno fica registrada, e o especialista vê (#365, 6d).
--
-- O aluno com especialista troca um exercício "só hoje" pela folha do "…". A
-- prescrição continua a mesma, mas o especialista precisa saber que o treino
-- de hoje não foi o que ele passou: a troca aparece no Acompanhamento do aluno
-- e no "Aconteceu" do briefing, no mobile e no web.
--
-- Só troca em treino prescrito é registrada. O Praticante muda o próprio plano
-- e não tem a quem avisar (Art. 6°, III).
--
-- A linha é evidência: ninguém escreve direto. Quem grava é a função, com o
-- autor tirado do JWT e a hora do servidor; o aluno não escolhe aluno, treino,
-- exercício de origem nem horário. Não há UPDATE nem DELETE para o cliente.
CREATE TABLE "exercise_swaps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL
    REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "workout_id" uuid NOT NULL
    REFERENCES "public"."workouts"("id") ON DELETE CASCADE,
  "workout_exercise_id" uuid
    REFERENCES "public"."workout_exercises"("id") ON DELETE SET NULL,
  -- O catálogo pode perder um exercício; a troca continua contada, sem o nome.
  "from_exercise_id" uuid
    REFERENCES "public"."exercises"("id") ON DELETE SET NULL,
  "to_exercise_id" uuid
    REFERENCES "public"."exercises"("id") ON DELETE SET NULL,
  "scope" text NOT NULL,
  "swapped_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "exercise_swaps_scope" CHECK ("scope" IN ('today', 'always', 'less'))
);
--> statement-breakpoint

COMMENT ON TABLE "exercise_swaps" IS
  'Troca de exercício feita pelo aluno num treino prescrito. Execução de contrato (Art. 7°, V). Lida pelo aluno e pelo especialista com vínculo ativo; gravada só por public.record_exercise_swap (#365).';
--> statement-breakpoint

ALTER TABLE "exercise_swaps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "exercise_swaps" FROM anon;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "exercise_swaps" FROM authenticated;
--> statement-breakpoint
GRANT SELECT ON "exercise_swaps" TO authenticated;
--> statement-breakpoint

CREATE INDEX "exercise_swaps_student_swapped_idx"
  ON "exercise_swaps" ("student_id", "swapped_at" DESC);
--> statement-breakpoint

CREATE POLICY "exercise_swaps_student_read" ON "exercise_swaps"
  FOR SELECT TO authenticated
  USING ("student_id" = (SELECT auth.uid()));
--> statement-breakpoint

CREATE POLICY "exercise_swaps_specialist_read" ON "exercise_swaps"
  FOR SELECT TO authenticated
  USING ((SELECT private.is_linked_specialist("student_id")));
--> statement-breakpoint

CREATE POLICY privileged_session_requires_mfa ON "exercise_swaps"
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.current_session_meets_mfa_requirement())
  WITH CHECK (private.current_session_meets_mfa_requirement());
--> statement-breakpoint

-- Registra a troca de um item de treino prescrito que o aluno enxerga: o da
-- periodização dele. O exercício de origem sai do item, e não do cliente.
CREATE OR REPLACE FUNCTION public.record_exercise_swap(
  p_workout_exercise_id uuid,
  p_to_exercise_id uuid,
  p_scope text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.exercise_swaps (
    student_id, workout_id, workout_exercise_id, from_exercise_id, to_exercise_id, scope
  )
  SELECT (SELECT auth.uid()), workout.id, item.id, item.exercise_id, p_to_exercise_id, p_scope
  FROM public.workout_exercises item
  JOIN public.workouts workout ON workout.id = item.workout_id
  JOIN public.training_plans phase ON phase.id = workout.training_plan_id
  JOIN public.training_periodizations period ON period.id = phase.periodization_id
  WHERE item.id = p_workout_exercise_id
    AND workout.specialist_id IS NOT NULL
    AND period.student_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.exercises exercise WHERE exercise.id = p_to_exercise_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'troca não registrada: o item % não é de um treino prescrito para você, ou o exercício % não existe',
      p_workout_exercise_id, p_to_exercise_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.record_exercise_swap(uuid, uuid, text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.record_exercise_swap(uuid, uuid, text) TO authenticated;
