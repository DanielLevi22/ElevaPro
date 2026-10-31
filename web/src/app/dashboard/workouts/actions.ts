"use server";

import { createWorkoutsService, type SetPlan } from "@elevapro/shared";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getAuthUserId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return user.id;
}

// ── Exercise items ─────────────────────────────────────────────────────────

export async function addExerciseAction(
  workoutId: string,
  periodizationId: string,
  phaseId: string,
  input: { exercise_id: string; order_index: number; set_plan: SetPlan },
) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  // Pelo serviço, que confere o plano de séries (#431). O insert direto deixava
  // o plano vazio.
  await createWorkoutsService(supabase).addExercisesToWorkout(workoutId, [input]);

  revalidatePath(`/dashboard/workouts/${workoutId}`);
  revalidatePath(`/dashboard/workouts/periodizations/${periodizationId}/phases/${phaseId}`);
}

export async function updateExerciseAction(
  itemId: string,
  workoutId: string,
  input: { set_plan: SetPlan },
) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  await createWorkoutsService(supabase).updateWorkoutExercise(itemId, input);

  revalidatePath(`/dashboard/workouts/${workoutId}`);
}

export async function deleteExerciseAction(itemId: string, workoutId: string) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("workout_exercises" as never)
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/workouts/${workoutId}`);
}

// ── Import workout from library ────────────────────────────────────────────

export async function importWorkoutAction(sourceWorkoutId: string, phaseId: string) {
  const userId = await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  // Pelo serviço: o treino de origem já chega com os itens e o plano de cada um
  // (nulo lido como vazio), em vez de uma segunda consulta com cast.
  const workoutsService = createWorkoutsService(supabase);
  const source = await workoutsService.fetchWorkoutById(sourceWorkoutId);
  if (!source) throw new Error(`Treino ${sourceWorkoutId} não encontrado na biblioteca`);

  // Duplicate workout linked to this phase
  const { data: created, error: wErr } = await supabase
    .from("workouts" as never)
    .insert({
      training_plan_id: phaseId,
      title: source.title,
      description: source.description,
      specialist_id: userId,
      muscle_group: source.muscle_group,
      difficulty: source.difficulty,
    } as never)
    .select()
    .maybeSingle();

  if (wErr) throw new Error(wErr.message);
  if (!created) throw new Error("Erro ao criar cópia do treino");

  const newWorkout = created as Record<string, unknown>;

  const items = source.exercises ?? [];
  if (items.length > 0) {
    // Com o plano junto: a cópia por colunas listadas à mão perdia as séries,
    // e o treino importado virava séries Normal (#431).
    await workoutsService.addExercisesToWorkout(
      newWorkout.id as string,
      items.map((item) => ({
        exercise_id: item.exercise_id,
        order_index: item.order_index,
        notes: item.notes ?? undefined,
        set_plan: item.set_plan,
      })),
    );
  }

  revalidatePath(`/dashboard/workouts/periodizations`);
}

// ── Periodization status ──────────────────────────────────────────────────

export async function activatePeriodizationAction(id: string) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const { data: p } = await supabase
    .from("training_periodizations" as never)
    .select("student_id")
    .eq("id", id)
    .single();

  if (p) {
    await supabase
      .from("training_periodizations" as never)
      .update({ status: "completed" } as never)
      .eq("student_id", (p as { student_id: string }).student_id)
      .eq("status", "active");
  }

  const { error } = await supabase
    .from("training_periodizations" as never)
    .update({ status: "active" } as never)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/workouts/periodizations/${id}`);
  revalidatePath("/dashboard/workouts");
}

export async function completePeriodizationAction(id: string) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("training_periodizations" as never)
    .update({ status: "completed" } as never)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/workouts/periodizations/${id}`);
  revalidatePath("/dashboard/workouts");
}

// ── Phase (training_plan) ──────────────────────────────────────────────────

export async function addPhaseAction(periodizationId: string) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const today = new Date().toISOString().split("T")[0];
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Count existing phases for auto-naming
  const { count } = await supabase
    .from("training_plans" as never)
    .select("id", { count: "exact", head: true })
    .eq("periodization_id", periodizationId);

  const { error } = await supabase.from("training_plans" as never).insert({
    periodization_id: periodizationId,
    name: `Fase ${(count ?? 0) + 1}`,
    start_date: today,
    end_date: in30Days,
    status: "planned",
  } as never);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/workouts/periodizations/${periodizationId}`);
}

export async function updatePhaseStatusAction(
  phaseId: string,
  periodizationId: string,
  status: "planned" | "active" | "completed",
) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("training_plans" as never)
    .update({ status } as never)
    .eq("id", phaseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/workouts/periodizations/${periodizationId}/phases/${phaseId}`);
  revalidatePath(`/dashboard/workouts/periodizations/${periodizationId}`);
}

export async function updatePhaseDatesAction(
  phaseId: string,
  periodizationId: string,
  data: { start_date?: string; end_date?: string },
) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("training_plans" as never)
    .update(data as never)
    .eq("id", phaseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/workouts/periodizations/${periodizationId}/phases/${phaseId}`);
}

export async function deletePhaseAction(phaseId: string, periodizationId: string) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("training_plans" as never)
    .delete()
    .eq("id", phaseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/workouts/periodizations/${periodizationId}`);
  revalidatePath("/dashboard/workouts");
}

export async function deleteWorkoutAction(
  workoutId: string,
  phaseId: string,
  periodizationId: string,
) {
  await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("workouts" as never)
    .delete()
    .eq("id", workoutId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/workouts/periodizations/${periodizationId}/phases/${phaseId}`);
}

export async function changeSplitAction(phaseId: string, periodizationId: string, split: string) {
  const userId = await getAuthUserId();
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles" as never)
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();

  const isMember = (profile as { account_type: string } | null)?.account_type !== "specialist";

  await supabase
    .from("workouts" as never)
    .delete()
    .eq("training_plan_id", phaseId);

  for (const letter of split.split("")) {
    await supabase.from("workouts" as never).insert({
      training_plan_id: phaseId,
      title: `Treino ${letter}`,
      specialist_id: isMember ? null : userId,
      student_id: isMember ? userId : null,
    } as never);
  }

  revalidatePath(`/dashboard/workouts/periodizations/${periodizationId}/phases/${phaseId}`);
}
