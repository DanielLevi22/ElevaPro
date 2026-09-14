import type { SupabaseClient } from "@supabase/supabase-js";

/** Uma sessão de cardio como o histórico da modalidade a mostra. */
export interface CardioHistoryEntry {
  startedAt: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
}

export interface ModalityHistory {
  last: CardioHistoryEntry;
  /** Maior distância nas modalidades com GPS; maior duração nas outras. */
  best: CardioHistoryEntry;
  /** Duração somada das sessões do mês corrente. */
  monthDurationSeconds: number;
}

export interface ModalityQuery {
  /** O nome gravado em `activity_name`, como "Corrida". */
  activityName: string;
  usesGps: boolean;
}

export interface LastCardio {
  activityName: string;
  durationSeconds: number | null;
}

interface HistoryRow {
  started_at: string;
  duration_seconds: number | null;
  distance_meters: number | null;
}

/**
 * Teto de sessões lidas por modalidade. Cobre anos de treino diário e impede que
 * o histórico inteiro de um aluno antigo venha na abertura da tela.
 */
const HISTORY_LIMIT = 400;

function toEntry(row: HistoryRow): CardioHistoryEntry {
  return {
    startedAt: row.started_at,
    durationSeconds: row.duration_seconds,
    distanceMeters: row.distance_meters,
  };
}

function bestOf(rows: HistoryRow[], usesGps: boolean): HistoryRow {
  const measure = (row: HistoryRow): number =>
    (usesGps ? row.distance_meters : row.duration_seconds) ?? 0;
  return rows.reduce((best, row) => (measure(row) > measure(best) ? row : best));
}

function monthDuration(rows: HistoryRow[], now: Date): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return rows
    .filter((row) => new Date(row.started_at) >= monthStart)
    .reduce((total, row) => total + (row.duration_seconds ?? 0), 0);
}

/**
 * O histórico de cardio do próprio Student, para a escolha da modalidade e o
 * "Repetir a última". Execução de contrato: data, duração e distância, e nada da
 * PSE, das observações ou da FC.
 *
 * @example
 * const history = await service.fetchModalityHistory(student.id, { activityName: "Corrida", usesGps: true }, new Date());
 */
export const createCardioHistoryService = (supabase: SupabaseClient) => ({
  /**
   * A última, a melhor e o total do mês de uma modalidade. Lê as últimas 400
   * sessões: "melhor" é a melhor delas, e não do histórico inteiro.
   *
   * @example
   * await service.fetchModalityHistory(student.id, { activityName: "Corrida", usesGps: true }, new Date());
   */
  fetchModalityHistory: async (
    studentId: string,
    modality: ModalityQuery,
    now: Date,
  ): Promise<ModalityHistory | null> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("started_at, duration_seconds, distance_meters")
      .eq("student_id", studentId)
      .eq("session_type", "cardio")
      .eq("activity_name", modality.activityName)
      .order("started_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) throw error;

    const rows = (data ?? []) as HistoryRow[];
    if (rows.length === 0) return null;
    return {
      last: toEntry(rows[0]),
      best: toEntry(bestOf(rows, modality.usesGps)),
      monthDurationSeconds: monthDuration(rows, now),
    };
  },

  /**
   * A modalidade e a duração da última sessão de cardio, para o "Repetir a última".
   * Sessão sem modalidade é pulada: não há o que repetir nela, e escondê-la não
   * pode esconder a anterior.
   *
   * @example
   * const last = await service.fetchLastCardio(student.id); // { activityName: "Bicicleta", durationSeconds: 1800 }
   */
  fetchLastCardio: async (studentId: string): Promise<LastCardio | null> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("activity_name, duration_seconds")
      .eq("student_id", studentId)
      .eq("session_type", "cardio")
      .not("activity_name", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.activity_name) return null;
    return { activityName: data.activity_name, durationSeconds: data.duration_seconds };
  },
});
