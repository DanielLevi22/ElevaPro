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
}
