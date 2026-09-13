import { createWorkoutsService, type SaveSessionSetInput } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { batimentoSeConsentido, notasSeConsentido } from './consentimento';

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * A gravação de uma sessão concluída — musculação ou cardio.
 *
 * Saiu da `workoutStore` porque não é estado: nada aqui é lido depois por tela
 * nenhuma. O que ela decide antes de chamar o serviço é o que importa, e mora
 * num lugar só para as duas sessões decidirem igual:
 *
 * - **visão do aluno** (`mascarado`): o especialista que navega como o aluno
 *   não grava sessão em nome dele;
 * - **consentimento**: as observações e a FC média são Art. 11 e só entram com
 *   consentimento vigente. Séries, cargas, datas e PSE são execução de
 *   contrato e entram sempre.
 */
interface Opcoes {
  /** O especialista está vendo o app como o aluno. */
  mascarado: boolean;
}

export interface SessaoDeForcaParaGravar {
  workoutId: string;
  studentId: string;
  startedAt: string;
  completedAt: string;
  items: { workoutExerciseId: string; exerciseId: string; sets: SaveSessionSetInput[] }[];
  /** PSE de 1 a 10, como o aluno respondeu no feedback. */
  perceivedExertion: number;
  notes?: string;
}

/**
 * Grava a sessão de musculação e uma linha por série. Devolve o id da sessão.
 *
 * O `exerciseId` vai junto do `workoutExerciseId` de propósito: a análise de
 * carga do Progresso agrupa por exercício do catálogo, e a tela antiga gravava
 * só o da prescrição — o gráfico ficava vazio com o aluno treinando.
 *
 * @example
 * const id = await gravarSessaoDeForca(sessao, { mascarado: isMasquerading });
 */
export async function gravarSessaoDeForca(
  sessao: SessaoDeForcaParaGravar,
  { mascarado }: Opcoes
): Promise<string | null> {
  // Sem o objeto: `notes` é o texto do aluno sobre a própria saúde, e log de
  // desenvolvimento vaza para onde ninguém controla.
  if (mascarado) return null;

  try {
    const gravada = await servicoDeTreinos.createWorkoutSession({
      workout_id: sessao.workoutId,
      student_id: sessao.studentId,
      started_at: sessao.startedAt,
      completed_at: sessao.completedAt,
      perceived_exertion: sessao.perceivedExertion,
      notes: await notasSeConsentido(sessao.studentId, sessao.notes),
      session_type: 'strength',
    });

    await servicoDeTreinos.saveSessionExercises(
      gravada.id,
      sessao.items.map((item) => ({
        workout_exercise_id: item.workoutExerciseId,
        exercise_id: item.exerciseId,
        sets: item.sets,
      }))
    );
    return gravada.id;
  } catch (erro) {
    // Sem o objeto de erro: o do PostgREST pode carregar o payload da linha.
    console.error('[registroDaSessao] falha ao gravar sessão de treino');
    throw erro;
  }
}

export interface SessaoDeCardioParaGravar {
  studentId: string;
  exerciseName: string;
  durationSeconds: number;
  calories: number;
  startedAt: string;
  completedAt: string;
  perceivedExertion?: number;
  notes?: string;
  /**
   * Medidas da corrida, derivadas no aparelho. Nulas quando o GPS não foi
   * autorizado — a corrida continua sendo gravada sem elas.
   */
  distanceMeters?: number | null;
  avgPaceSecondsPerKm?: number | null;
  avgCadenceSpm?: number | null;
  /** Dado de Art. 11: só é gravado com consentimento vigente. */
  avgHeartRate?: number | null;
}

/**
 * Grava a sessão de cardio e, com consentimento, a FC média em tabela própria.
 *
 * Sem prescrição: cardio livre não vem de treino nenhum. Até a `0035` isto
 * criava uma linha sintética em `workouts` só para ter um id, com
 * `specialist_id` recebendo o id do **aluno**.
 *
 * @example
 * await gravarSessaoDeCardio(corrida, { mascarado: isMasquerading });
 */
export async function gravarSessaoDeCardio(
  sessao: SessaoDeCardioParaGravar,
  { mascarado }: Opcoes
): Promise<void> {
  if (mascarado) return;

  try {
    const gravada = await servicoDeTreinos.createWorkoutSession({
      workout_id: null,
      student_id: sessao.studentId,
      started_at: sessao.startedAt,
      completed_at: sessao.completedAt,
      perceived_exertion: sessao.perceivedExertion,
      // Só o que o aluno digitou. Duração e calorias moravam aqui dentro, numa
      // string gerada, e sumiam no instante em que ele escrevia qualquer coisa.
      notes: await notasSeConsentido(sessao.studentId, sessao.notes),
      session_type: 'cardio',
      duration_seconds: sessao.durationSeconds,
      active_calories: Math.round(sessao.calories),
      activity_name: sessao.exerciseName,
      // Execução de contrato, como duração e calorias: exigir consentimento
      // aqui desligaria o acompanhamento de desempenho de quem revoga.
      distance_meters: sessao.distanceMeters ?? null,
      avg_pace_seconds_per_km: sessao.avgPaceSecondsPerKm ?? null,
      avg_cadence_spm: sessao.avgCadenceSpm ?? null,
    });
    await gravarBatimento(gravada.id, sessao.studentId, sessao.avgHeartRate ?? null);
  } catch (erro) {
    // Sem o objeto de erro: o payload aqui inclui `notes`, dado de saúde.
    console.error('[registroDaSessao] falha ao gravar sessão de cardio');
    throw erro;
  }
}

/**
 * A FC depois da sessão, porque depende do id dela — e sem derrubar a corrida.
 *
 * Deixar esta falha subir diria ao aluno que o treino não foi salvo, e a
 * tentativa seguinte criaria uma segunda linha: perder a corrida inteira por
 * causa do batimento é pior que perder o batimento.
 */
async function gravarBatimento(sessaoId: string, alunoId: string, medido: number | null) {
  const batimento = await batimentoSeConsentido(alunoId, medido);
  if (batimento === null) return;
  try {
    await servicoDeTreinos.saveSessionHeartRate(sessaoId, batimento);
  } catch {
    // Sem o objeto de erro: o do PostgREST carrega o payload, e é dado de saúde.
    console.error('[registroDaSessao] sessão gravada, FC média não');
  }
}
