import type { WorkoutSessionType } from "./workouts.types";

/**
 * Quem produziu o evento.
 *
 * A autoria sai das políticas de RLS, não de uma lista escrita à mão: quem pode
 * escrever cada tabela já está decidido lá. `diet_plans` é o caso que uma lista
 * erraria — o mesmo tipo de evento tem autores diferentes conforme
 * `specialist_id` estar preenchido ou não.
 */
export type ActivityAuthor = "student" | "specialist";

/** Estado do filtro da aba Atividades. `all` existe para auditoria. */
export type ActivityAuthorFilter = ActivityAuthor | "all";

export type ActivityKind =
  | "workout"
  | "cardio"
  | "meal"
  | "assessment"
  | "diet_plan"
  | "body_scan"
  | "anamnesis";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  author: ActivityAuthor;
  /** ISO. Ordena dentro do dia. */
  at: string;
  title: string;
  /** Linha secundária já montada — "32 min · 280 kcal", "Plano ativo". */
  detail: string | null;
  /**
   * RPE de 1 a 10, quando a sessão tem. Use `formatRpe` para exibir; o número
   * cru atravessa a fronteira porque a formatação é decisão da tela.
   */
  rpe: number | null;
  /**
   * O que o aluno escreveu, e só isso. Dado sensível de saúde (Art. 11) — só
   * viaja para quem passou por `authorizeLinkedSpecialist`.
   */
  studentNote: string | null;
}

/**
 * Resumo do dia, vindo de `daily_goals`.
 *
 * A meta vem junto com o realizado de propósito: "3 refeições" não diz nada,
 * "3/4" diz. Recalcular a meta no feed duplicaria a regra que a gamificação já
 * aplica, e as duas divergiriam no primeiro ajuste.
 */
export interface ActivityDaySummary {
  mealsTarget: number;
  mealsCompleted: number;
  workoutTarget: number;
  workoutCompleted: number;
  completed: boolean;
}

export interface ActivityDay {
  /** `YYYY-MM-DD`, na data local do registro. */
  date: string;
  /** Nulo quando a gamificação não gerou linha para o dia. */
  summary: ActivityDaySummary | null;
  events: ActivityEvent[];
}

/**
 * Um item do bloco "Aconteceu" do briefing.
 *
 * É o que atravessa a fronteira para o cliente: nome, tipo, título, RPE e
 * horário. Nem `notes`, nem linha de sessão, nem id de treino — o comentário
 * do `briefing/page.tsx` registra a razão.
 */
export interface RecentActivityItem {
  id: string;
  studentId: string;
  studentName: string;
  kind: ActivityKind;
  title: string;
  rpe: number | null;
  at: string;
}

export interface WorkoutSessionRow {
  id: string;
  student_id: string;
  started_at: string;
  completed_at: string | null;
  intensity: number | null;
  notes: string | null;
  session_type: WorkoutSessionType;
  duration_seconds: number | null;
  active_calories: number | null;
  activity_name: string | null;
}
