import { supabaseAdmin } from "@/lib/supabase-admin";
import type { BulkWorkoutExercise, BulkWorkoutItem } from "../types";

/**
 * Gravar treinos com os exercícios de cada um numa fase da periodização.
 *
 * Saiu da rota de aprovação do especialista quando o onboarding do Praticante
 * (#365) passou a aprovar treino também: as duas gravam o mesmo formato, e o
 * Praticante não tem especialista — o dono é o próprio aluno.
 */

/** De quem é o treino: o especialista que prescreveu, ou o aluno sem especialista. */
export interface WorkoutOwner {
  specialistId: string | null;
  studentId: string | null;
}

async function saveWorkout(
  workout: BulkWorkoutItem,
  phaseId: string,
  owner: WorkoutOwner,
): Promise<{ workoutId: string; title: string }> {
  const { data, error } = await supabaseAdmin
    .from("workouts" as never)
    .insert({
      specialist_id: owner.specialistId,
      student_id: owner.studentId,
      training_plan_id: phaseId,
      title: workout.title,
      muscle_group: workout.muscle_group ?? null,
      difficulty: workout.difficulty ?? null,
      day_of_week: workout.day_of_week ?? null,
      description: workout.description ?? null,
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(`Failed to save workout "${workout.title}": ${error.message}`);
  return { workoutId: (data as { id: string }).id, title: workout.title };
}

/** A carga de partida por exercício do catálogo: o próximo bloco começa da conquistada. */
export type StartingLoads = ReadonlyMap<string, string>;

async function saveExercises(
  workoutId: string,
  exercises: BulkWorkoutItem["exercises"],
  loads?: StartingLoads,
): Promise<void> {
  if (!exercises?.length) return;

  const names = exercises.map((e: BulkWorkoutExercise) => e.exercise_name);

  const { data: exerciseRows, error } = await supabaseAdmin
    .from("exercises" as never)
    .select("id, name")
    .in("name" as never, names as never);
  // Sem ler o erro, catálogo fora do ar virava "nenhum exercício encontrado" e o
  // treino era gravado vazio.
  if (error) throw new Error(`exercícios do treino não foram lidos: ${error.message}`);

  const exerciseMap = new Map(
    ((exerciseRows as { id: string; name: string }[] | null) ?? []).map((e) => [
      e.name.toLowerCase(),
      e.id,
    ]),
  );

  // Fuzzy fallback for names not found exactly
  const notFound = names.filter((n) => !exerciseMap.has(n.toLowerCase()));
  for (const name of notFound as string[]) {
    const { data: fuzzy, error: fuzzyError } = await supabaseAdmin
      .from("exercises" as never)
      .select("id, name")
      .ilike("name" as never, `%${name}%` as never)
      .limit(1)
      .maybeSingle();
    if (fuzzyError) {
      throw new Error(`busca do exercício "${name}" falhou: ${fuzzyError.message}`);
    }
    if (fuzzy) {
      const row = fuzzy as { id: string; name: string };
      exerciseMap.set(name.toLowerCase(), row.id);
    }
  }

  const rows = exercises
    .map((e: BulkWorkoutExercise, idx: number) => {
      const exerciseId = exerciseMap.get(e.exercise_name.toLowerCase());
      if (!exerciseId) return null;
      return {
        workout_id: workoutId,
        exercise_id: exerciseId,
        sets: e.sets,
        reps: e.reps,
        rest_seconds: e.rest_seconds,
        weight: loads?.get(exerciseId) ?? null,
        notes: e.notes ?? null,
        order_index: idx,
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return;
  const { error: insertError } = await supabaseAdmin
    .from("workout_exercises" as never)
    .insert(rows as never[]);
  // Lançar aciona o desfazer da aprovação: sem isto, o treino ficava sem exercícios.
  if (insertError) {
    throw new Error(`exercícios do treino ${workoutId} não foram gravados: ${insertError.message}`);
  }
}

/**
 * Grava cada treino e seus exercícios, e avisa cada id criado para quem
 * desfaz a gravação se algo falhar no meio.
 *
 * @example
 * const salvos = await saveWorkoutsWithExercises(proposta.workouts, phaseId, { specialistId, studentId: null }, ctx.registrar);
 */
export async function saveWorkoutsWithExercises(
  workouts: BulkWorkoutItem[],
  phaseId: string,
  owner: WorkoutOwner,
  registrar: (id: string) => void,
  loads?: StartingLoads,
): Promise<{ id: string; title: string }[]> {
  const salvos: { id: string; title: string }[] = [];
  for (const workout of workouts) {
    const { workoutId, title } = await saveWorkout(workout, phaseId, owner);
    registrar(workoutId);
    await saveExercises(workoutId, workout.exercises, loads);
    salvos.push({ id: workoutId, title });
  }
  return salvos;
}
