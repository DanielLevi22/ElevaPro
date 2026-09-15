export interface HealthDailyMetric {
  id: string;
  student_id: string;
  /** ISO date, sem componente de hora — a granularidade é o dia. */
  date: string;
  steps: number;
  active_calories: number;
  /** Duração do sono em minutos. `null` = sem leitura no dia, nunca zero. */
  sleep_minutes: number | null;
  /** FC de repouso em bpm. `null` = sem leitura no dia. */
  resting_heart_rate: number | null;
  /** Prontidão do dia, 0 a 100 (ADR-0029). `null` sem base ou sem leitura. */
  readiness_score: number | null;
  /** A versão da regra que calculou a nota; nula junto com ela. */
  readiness_version: number | null;
  synced_at: string;
  created_at: string;
}

export interface HealthMetricInput {
  date: string;
  steps: number;
  active_calories: number;
  /**
   * Opcionais porque a leitura de cada métrica falha por conta própria: um
   * relógio pode dar passos e não dar sono, e a gravação parcial é o caso
   * comum, não a exceção. Omitir preserva o que já está gravado — ver
   * `upsertDaily`.
   */
  sleep_minutes?: number | null;
  resting_heart_rate?: number | null;
  /**
   * A prontidão e a versão da regra, juntas num objeto para não existir nota sem
   * régua. `null` apaga a do dia (a base deixou de bastar); omitir preserva.
   */
  readiness?: { score: number; version: number } | null;
}
