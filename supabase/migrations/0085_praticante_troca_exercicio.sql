-- O Praticante troca de vez um exercício do próprio treino (#365, desenho 6d).
--
-- O aluno não tem política de escrita em `workout_exercises`: a prescrição é
-- do especialista. O Praticante não tem especialista, e o plano dele nasceu no
-- onboarding com `workouts.specialist_id` nulo e `student_id` dele. Uma
-- política de UPDATE deixaria ele mudar séries, carga e ordem por fora do app;
-- a função muda só o exercício, e só nesse treino.
--
-- O destino é do catálogo oficial (`created_by` nulo): um exercício privado de
-- algum especialista não entra no plano de quem não é aluno dele.
CREATE OR REPLACE FUNCTION public.swap_workout_exercise(
  p_workout_exercise_id uuid,
  p_exercise_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.workout_exercises item
  SET exercise_id = p_exercise_id
  FROM public.workouts workout
  WHERE item.id = p_workout_exercise_id
    AND workout.id = item.workout_id
    AND workout.specialist_id IS NULL
    AND workout.student_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.exercises exercise
      WHERE exercise.id = p_exercise_id
        AND exercise.created_by IS NULL
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'troca recusada: o item % não é de um treino seu sem especialista, ou o exercício % não é do catálogo oficial',
      p_workout_exercise_id, p_exercise_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.swap_workout_exercise(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.swap_workout_exercise(uuid, uuid) TO authenticated;
