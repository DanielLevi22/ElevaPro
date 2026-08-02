export interface HealthDailyMetric {
  id: string;
  student_id: string;
  /** ISO date, sem componente de hora — a granularidade é o dia. */
  date: string;
  steps: number;
  active_calories: number;
  synced_at: string;
  created_at: string;
}

export interface HealthMetricInput {
  date: string;
  steps: number;
  active_calories: number;
}
