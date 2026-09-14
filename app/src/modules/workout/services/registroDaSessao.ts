import {
  createWorkoutsService,
  numeroDaPrescricao,
  type SaveSessionSetInput,
  type SerieFeita,
  type Workout,
  type WorkoutExercise,
  type ZoneShare,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { registrarAviso, registrarFalha } from '@/lib/registro';
import type { EstadoDaSessao } from '../store/maquinaDaSessao';
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

/** O que o aluno respondeu no feedback, junto de quem é a sessão. */
export interface FeedbackDaSessao {
  alunoId: string;
  pse: number;
  notas: string;
}

type SessaoExecutada = Pick<EstadoDaSessao, 'itens' | 'feitas' | 'iniciadaEm' | 'concluidaEm'>;

/**
 * A sessão executada no formato da gravação: só os exercícios com série feita,
 * cada série com o prescrito ao lado do executado.
 *
 * O prescrito vem do treino como o especialista o montou; o executado, do que
 * o aluno fez com os ajustes da sessão. Separar os dois é o que torna a
 * evolução mensurável — ajustar a carga no meio do treino não reescreve o que
 * foi prescrito.
 *
 * @example
 * const paraGravar = montarSessaoDeForca(treino, sessao, { alunoId, pse: 7, notas: '' }, Date.now());
 */
export function montarSessaoDeForca(
  treino: Workout,
  sessao: SessaoExecutada,
  { alunoId, pse, notas }: FeedbackDaSessao,
  agora: number
): SessaoDeForcaParaGravar {
  const prescritos = new Map((treino.exercises ?? []).map((item) => [item.id, item]));
  return {
    workoutId: treino.id,
    studentId: alunoId,
    startedAt: new Date(sessao.iniciadaEm ?? agora).toISOString(),
    completedAt: new Date(sessao.concluidaEm ?? agora).toISOString(),
    perceivedExertion: pse,
    notes: notas,
    items: sessao.itens
      .filter((item) => (sessao.feitas[item.id]?.length ?? 0) > 0)
      .map((item) => ({
        workoutExerciseId: item.id,
        exerciseId: item.exercise_id,
        sets: seriesParaGravar(prescritos.get(item.id), sessao.feitas[item.id] ?? []),
      })),
  };
}

function seriesParaGravar(
  prescrito: WorkoutExercise | undefined,
  feitas: readonly SerieFeita[]
): SaveSessionSetInput[] {
  return feitas.map((serie) => ({
    reps_prescribed: prescrito?.reps ?? null,
    reps_actual: serie.reps,
    weight_prescribed: numeroDaPrescricao(prescrito?.weight),
    weight_actual: serie.carga,
    rest_prescribed: prescrito?.rest_seconds ?? null,
    completed: true,
  }));
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
    // Sem o objeto de erro: o do PostgREST pode carregar o payload da linha, e
    // `notes` é o texto do aluno sobre a própria saúde.
    registrarFalha('sessao.gravar', { tipo: 'forca' });
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
  /** Tempo em cada zona de FC. Art. 11, e nulo sem idade declarada na anamnese. */
  heartRateZones?: ZoneShare | null;
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
    await saveVitalsIfConsented(gravada.id, sessao);
  } catch (erro) {
    // Sem o objeto de erro: o payload aqui inclui `notes`, dado de saúde.
    registrarFalha('sessao.gravar', { tipo: 'cardio' });
    throw erro;
  }
}

/**
 * A FC média e as zonas depois da sessão, porque dependem do id dela — e sem
 * derrubar a corrida.
 *
 * Deixar esta falha subir diria ao aluno que o treino não foi salvo, e a
 * tentativa seguinte criaria uma segunda linha: perder a corrida inteira por
 * causa do batimento é pior que perder o batimento. As zonas seguem a média:
 * sem consentimento ou sem medida, nenhuma das duas vai.
 */
async function saveVitalsIfConsented(
  sessionId: string,
  session: SessaoDeCardioParaGravar
): Promise<void> {
  const avgHeartRate = await batimentoSeConsentido(session.studentId, session.avgHeartRate ?? null);
  if (avgHeartRate === null) return;
  try {
    await servicoDeTreinos.saveSessionVitals(sessionId, {
      avgHeartRate,
      zones: session.heartRateZones ?? null,
    });
  } catch {
    // Sem o objeto de erro: o do PostgREST carrega o payload, e é dado de saúde.
    registrarAviso('session.save_vitals', { sessionSaved: true });
  }
}
