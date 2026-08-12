import type { PlanProposalData } from "./tools/studentCoachTools";

export type { PlanProposalData };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  studentId: string;
  specialistId: string;
  module: "workout" | "nutrition" | "general";
  createdAt: string;
  updatedAt: string;
}

export interface PeriodizationProposal {
  name: string;
  goal: string;
  durationWeeks: number;
  level: string;
  phases: {
    name: string;
    weeks: number;
    focus: string;
  }[];
}

/** Os campos da anamnese que o prompt usa. Nada além disso atravessa a fronteira. */
export interface StudentHealthContext {
  objective?: string;
  trainingExperience?: string;
  trainingFrequency?: string;
  availableDays?: string;
  /** Dado sensível (Art. 11): é o que impede prescrição contraindicada. */
  injuries?: string;
  healthConditions?: string;
  weightKg?: number;
  heightCm?: number;
  bodyFatPct?: number;
}

/**
 * O que vai para o prompt da Anthropic.
 *
 * **Sem o nome do titular, de propósito.** O modelo monta treino igual chamando
 * de "o aluno", e o payload deixa de identificar quem é — Necessidade
 * (Art. 6°, III).
 *
 * `health` é `null` quando não há consentimento vigente
 * (`student_consents.health_data_collection`), e aí o coach diz isso em vez de
 * agir como se o aluno não tivesse histórico.
 */
export interface StudentContext {
  studentId: string;
  health: StudentHealthContext | null;
  /** Por que a saúde não veio — separa "sem consentimento" de "sem dado". */
  healthUnavailableReason: "no_consent" | null;
  periodizations: {
    id: string;
    name: string;
    goal: string;
    status: string;
    phases: { id: string; name: string; weeks: number; focus: string }[];
  }[];
}

export interface BulkWorkoutExercise {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

export interface BulkWorkoutItem {
  title: string;
  muscle_group?: string;
  difficulty?: string;
  day_of_week?: string;
  description?: string;
  exercises?: BulkWorkoutExercise[];
}

export interface BulkWorkoutProposal {
  phase_id: string;
  phase_name: string;
  workouts: BulkWorkoutItem[];
}

export interface AiSessionState {
  savedWorkouts: { id: string; title: string; phaseId: string }[];
  pendingWorkoutProposal?: BulkWorkoutProposal;
}

export type SseEvent =
  | { type: "text"; content: string }
  | { type: "proposal"; data: PeriodizationProposal }
  | { type: "workout_proposal"; data: BulkWorkoutProposal }
  | { type: "plan_proposal"; data: PlanProposalData }
  | { type: "saved"; entity: "periodization"; id: string; name: string }
  | { type: "done" }
  | { type: "error"; message: string };
