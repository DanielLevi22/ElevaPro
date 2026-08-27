import type { PlanProposalData } from "./tools/studentCoachTools";

export type { PlanProposalData };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

/** O que a lista de conversas precisa mostrar. */
export interface ChatSessionSummary {
  id: string;
  /** Nulo até a conversa ganhar título pelo que foi discutido. */
  title: string | null;
  created_at: string;
  updated_at: string;
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
  /** AAAA-MM-DD. O card mostra o período e o banco recusa nulo desde a 0024. */
  startDate: string;
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

export interface DietPlanProposal {
  name: string;
  plan_type: "unique" | "cyclic";
  start_date: string;
  duration_weeks: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  notes?: string;
}

export interface DietMealItemProposal {
  food_name: string;
  quantity: number;
  unit: string;
}

export interface DietMealProposal {
  name: string;
  meal_time?: string;
  /** 0=Dom a 6=Sáb, só na dieta cíclica. */
  day_of_week?: number;
  items: DietMealItemProposal[];
}

export interface DietMealsProposal {
  plan_name: string;
  plan_type: "unique" | "cyclic";
  meals: DietMealProposal[];
}

export interface AiSessionState {
  savedWorkouts: { id: string; title: string; phaseId: string }[];
  pendingWorkoutProposal?: BulkWorkoutProposal;
  /** Guardadas no servidor: a aprovação salva a cópia, não o que o modelo reemitir. */
  pendingDietPlan?: DietPlanProposal;
  pendingDietMeals?: DietMealsProposal;
  savedDietPlanId?: string;
}

export type SseEvent =
  | { type: "text"; content: string }
  /** O modelo parou para consultar ou gravar. Sem isto o stream fica mudo. */
  | { type: "tool_start"; tool: string; label: string }
  | { type: "tool_end"; tool: string }
  | { type: "proposal"; data: PeriodizationProposal }
  | { type: "workout_proposal"; data: BulkWorkoutProposal }
  | { type: "diet_plan_proposal"; data: DietPlanProposal }
  | { type: "diet_meals_proposal"; data: DietMealsProposal }
  | { type: "plan_proposal"; data: PlanProposalData }
  | { type: "saved"; entity: "periodization" | "diet_plan"; id: string; name: string }
  | { type: "done" }
  | { type: "error"; message: string };
