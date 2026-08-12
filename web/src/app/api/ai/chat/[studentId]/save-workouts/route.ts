import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getOrCreateSession,
  getSessionState,
  saveMessage,
  updateSessionState,
} from "@/modules/ai/services/chatService";
import type { BulkWorkoutExercise, BulkWorkoutItem } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

async function saveWorkout(
  workout: BulkWorkoutItem,
  phaseId: string,
  specialistId: string,
): Promise<{ workoutId: string; title: string }> {
  const { data, error } = await supabaseAdmin
    .from("workouts" as never)
    .insert({
      specialist_id: specialistId,
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

async function saveExercises(
  workoutId: string,
  exercises: BulkWorkoutItem["exercises"],
): Promise<void> {
  if (!exercises?.length) return;

  const names = exercises.map((e: BulkWorkoutExercise) => e.exercise_name);

  const { data: exerciseRows } = await supabaseAdmin
    .from("exercises" as never)
    .select("id, name")
    .in("name" as never, names as never);

  const exerciseMap = new Map(
    ((exerciseRows as { id: string; name: string }[] | null) ?? []).map((e) => [
      e.name.toLowerCase(),
      e.id,
    ]),
  );

  // Fuzzy fallback for names not found exactly
  const notFound = names.filter((n) => !exerciseMap.has(n.toLowerCase()));
  for (const name of notFound as string[]) {
    const { data: fuzzy } = await supabaseAdmin
      .from("exercises" as never)
      .select("id, name")
      .ilike("name" as never, `%${name}%` as never)
      .limit(1)
      .maybeSingle();
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
        notes: e.notes ?? null,
        order_index: idx,
      };
    })
    .filter(Boolean);

  if (rows.length > 0) {
    await supabaseAdmin.from("workout_exercises" as never).insert(rows as never[]);
  }
}

// POST /api/ai/chat/[studentId]/save-workouts
// Saves the pending bulk workout proposal directly, without going through the AI.
// Called when the specialist clicks "Aprovar e Salvar Todos" on the BulkWorkoutProposalCard.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  // `studentId` vem da URL: sem a checagem de vínculo, esta rota grava
  // prescrição na conta de qualquer aluno. O `service_role` abaixo não consulta
  // RLS — a barreira é esta linha.
  const auth = await authorizeLinkedSpecialist(request, studentId);
  if (!auth.ok) return auth.response;
  const specialistId = auth.caller.id;

  const sessionId = await getOrCreateSession(studentId, specialistId, "workout");
  const sessionState = await getSessionState(sessionId);

  const proposal = sessionState.pendingWorkoutProposal;
  if (!proposal) {
    return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
  }

  const workouts = proposal.workouts ?? [];
  const saved: { id: string; title: string }[] = [];

  for (const workout of workouts) {
    try {
      const { workoutId, title } = await saveWorkout(workout, proposal.phase_id, specialistId);
      await saveExercises(workoutId, workout.exercises);
      saved.push({ id: workoutId, title });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // Persist saved workouts in session state and clear the pending proposal
  await updateSessionState(sessionId, {
    savedWorkouts: [
      ...sessionState.savedWorkouts,
      ...saved.map((w) => ({ id: w.id, title: w.title, phaseId: proposal.phase_id })),
    ],
    pendingWorkoutProposal: undefined,
  });

  // A aprovação acontece no cartão, fora da conversa. Sem esta linha o
  // histórico não registra nada, e no turno seguinte o coach responde que ainda
  // falta aprovar — o especialista acabou de aprovar e ouve que não aprovou.
  await saveMessage(
    sessionId,
    "assistant",
    `✅ Treinos aprovados e salvos na fase ${proposal.phase_name}: ${saved
      .map((w) => w.title)
      .join(", ")}.`,
  );

  return NextResponse.json({ saved });
}
