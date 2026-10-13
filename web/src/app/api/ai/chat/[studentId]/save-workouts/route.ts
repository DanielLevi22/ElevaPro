import { withAiRoute } from "@/lib/ai-route";
import {
  acessoDoEspecialista,
  criarRotaDeAprovacao,
  especialistaDe,
} from "@/modules/ai/services/rotaDeAprovacao";
import { saveWorkoutsWithExercises } from "@/modules/ai/services/workoutPersistence";
import type { BulkWorkoutProposal } from "@/modules/ai/types";

// Na Vercel uma rota sem isto morre no default de poucos segundos. Uma conversa
// com uso de ferramenta passa disso com folga, e localmente não existe teto —
// por isso o chat funcionava na máquina e não no preview. 60s é o máximo do
// plano Hobby; no Pro dá para subir até 300.
export const maxDuration = 60;

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

    gravar: (ctx, proposta) =>
      saveWorkoutsWithExercises(
        proposta.workouts ?? [],
        proposta.phase_id,
        // `student_id` fica como sempre ficou neste fluxo: o treino é do especialista.
        { specialistId: especialistaDe(ctx), studentId: null },
        ctx.registrar,
      ),

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
