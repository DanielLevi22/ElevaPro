import { type NextRequest, NextResponse } from "next/server";
import { authorizeLinkedSpecialist } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aprovarProposta } from "@/modules/ai/services/aprovacaoDaProposta";
import {
  getOrCreateSession,
  getSessionState,
  saveMessage,
  sessionOwnedBy,
  updateSessionState,
} from "@/modules/ai/services/chatService";
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
 * Apaga os treinos que esta chamada chegou a criar.
 *
 * Só é chamado quando a gravação falhou no meio. `workout_exercises` tem
 * `ON DELETE CASCADE` a partir de `workouts`, então apagar o treino leva os
 * exercícios junto.
 */
async function apagarTreinos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin
    .from("workouts" as never)
    .delete()
    .in("id", ids);
  if (error) throw new Error(`falha ao desfazer os treinos ${ids.join(", ")}: ${error.message}`);
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

  // A proposta pendente vive no `state` da conversa que a produziu. Sem o
  // `sessionId` do cliente esta rota pegava a mais recente — e aprovar numa
  // conversa antiga da lateral lia o estado de outra, respondendo "nenhuma
  // proposta pendente" com a proposta na tela. O dono é validado porque o id
  // vem do cliente e o `service_role` abaixo não consulta RLS.
  const corpo = await request.json().catch(() => null);
  const pedida = typeof corpo?.sessionId === "string" ? corpo.sessionId : undefined;

  const sessionId = pedida
    ? await sessionOwnedBy(pedida, studentId, specialistId)
    : await getOrCreateSession(studentId, specialistId, "workout");

  if (!sessionId) {
    return NextResponse.json({ error: "conversa não encontrada" }, { status: 404 });
  }

  const sessionState = await getSessionState(sessionId);

  // Os ids que esta chamada criar, para o desfazer alcançá-los se a gravação
  // falhar no meio: sem isso, os treinos que já entraram ficariam no banco com
  // a proposta de volta na fila, e a segunda tentativa os duplicaria.
  const criados: string[] = [];

  // A proposta é reivindicada, não lida: quem chega primeiro a recebe, quem
  // chega depois recebe nada. Era essa janela que deixava duas abas — ou um
  // retry depois do tempo — gravarem os mesmos treinos duas vezes.
  // Só as linhas moram aqui dentro. O estado e a mensagem vêm depois do
  // sucesso: escrevê-los junto abriria a chance de o cartão dizer "salvo" para
  // treinos que o desfazer acabou de apagar.
  let aprovada: BulkWorkoutProposal | undefined;

  let saved: { id: string; title: string }[] | null;
  try {
    saved = await aprovarProposta<BulkWorkoutProposal, { id: string; title: string }[]>(
      sessionId,
      "pendingWorkoutProposal",
      {
        gravar: async (proposal) => {
          aprovada = proposal;
          const salvos: { id: string; title: string }[] = [];

          for (const workout of proposal.workouts ?? []) {
            const { workoutId, title } = await saveWorkout(
              workout,
              proposal.phase_id,
              specialistId,
            );
            await saveExercises(workoutId, workout.exercises);
            criados.push(workoutId);
            salvos.push({ id: workoutId, title });
          }

          return salvos;
        },
        desfazer: () => apagarTreinos(criados),
      },
    );
  } catch (err) {
    console.error("[POST save-workouts] especialista", specialistId, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  if (!saved || !aprovada) {
    return NextResponse.json({ error: "Nenhuma proposta pendente encontrada." }, { status: 400 });
  }
  const proposal = aprovada;

  // Sai da fila de decisão e vira histórico da tela. A chave pendente já saiu
  // do `state` na reivindicação; o que falta é o registro do que foi aprovado,
  // porque sumir de vez deixava a conversa anunciando "aprovados e salvos: A,
  // B, C" com a tela sem nada para mostrar ao reabrir.
  await updateSessionState(sessionId, {
    savedWorkouts: [
      ...sessionState.savedWorkouts,
      ...saved.map((w) => ({ id: w.id, title: w.title, phaseId: proposal.phase_id })),
    ],
    resolvedWorkoutProposal: { proposal, savedTitles: saved.map((w) => w.title) },
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
