import { withAiRoute } from "@/lib/ai-route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  acessoDoEspecialista,
  criarRotaDeAprovacao,
  especialistaDe,
} from "@/modules/ai/services/rotaDeAprovacao";
import type { BulkWorkoutExercise, BulkWorkoutItem, BulkWorkoutProposal } from "@/modules/ai/types";

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

/**
 * Grava os treinos da fase a partir da proposta guardada no servidor.
 *
 * O que é salvo é a cópia que o especialista revisou no cartão. Pedir ao modelo
 * que reemitisse tudo num segundo turno daria a uma proposta de 4 treinos × 6
 * exercícios espaço de sobra para divergir do que foi aprovado.
 */
export const POST = withAiRoute(
  criarRotaDeAprovacao<BulkWorkoutProposal, { id: string; title: string }[]>({
    rotulo: "POST save-workouts",
    chave: "pendingWorkoutProposal",
    acesso: acessoDoEspecialista("workout"),
    // `workout_exercises` cai por cascata a partir de `workouts`.
    desfazerEm: "workouts",

    gravar: async (ctx, proposta) => {
      const salvos: { id: string; title: string }[] = [];

      for (const workout of proposta.workouts ?? []) {
        const { workoutId, title } = await saveWorkout(
          workout,
          proposta.phase_id,
          especialistaDe(ctx),
        );
        await saveExercises(workoutId, workout.exercises);
        ctx.registrar(workoutId);
        salvos.push({ id: workoutId, title });
      }

      return salvos;
    },

    resolver: (proposta, salvos, estado) => ({
      savedWorkouts: [
        ...estado.savedWorkouts,
        ...salvos.map((w) => ({ id: w.id, title: w.title, phaseId: proposta.phase_id })),
      ],
      resolvedWorkoutProposal: { proposal: proposta, savedTitles: salvos.map((w) => w.title) },
    }),

    mensagem: (proposta, salvos) =>
      `✅ Treinos aprovados e salvos na fase ${proposta.phase_name}: ${salvos
        .map((w) => w.title)
        .join(", ")}.`,

    corpo: (_proposta, salvos) => ({ saved: salvos }),
  }),
);
