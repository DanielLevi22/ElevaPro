import type {
  BulkWorkoutExercise,
  BulkWorkoutItem,
  BulkWorkoutProposal,
  ChatMessage,
  PeriodizationProposal,
  WorkoutSseEvent,
} from "@elevapro/shared";
import type { PlanProposalData } from "./tools/studentCoachTools";

// Contrato de proposta de treino e o formato de mensagem: mesmo tipo que o
// mobile consome do mesmo endpoint de chat — a fonte única vive em shared/.
export type {
  BulkWorkoutExercise,
  BulkWorkoutItem,
  BulkWorkoutProposal,
  ChatMessage,
  PeriodizationProposal,
  PlanProposalData,
};

export type ChatModule = "workout" | "nutrition" | "general";

/** O que a lista de conversas precisa mostrar. */
export interface ChatSessionSummary {
  id: string;
  /** Nulo até a conversa ganhar título pelo que foi discutido. */
  title: string | null;
  /**
   * Qual coach conduz esta conversa.
   *
   * A lateral mistura treino e nutrição, e é isto que decide o ícone da linha e
   * qual chat abre à direita — sem ele a lista seria ambígua e o clique abriria
   * o coach errado.
   */
  module: ChatModule;
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
    /** `workoutCount` é o que diz se a fase ainda precisa ser montada. */
    phases: { id: string; name: string; weeks: number; focus: string; workoutCount: number }[];
  }[];
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
  /**
   * A periodização proposta e ainda não aprovada.
   *
   * Faltava, e era o que tornava a aprovação impossível: o histórico que o
   * modelo relê tem só texto — chamada de ferramenta e resultado não são
   * gravados —, então no turno seguinte ele não tinha nome, semanas, data nem
   * fases para passar ao `save_periodization`. Para reconstruir, ele propunha
   * de novo, a rota respondia "aguardando aprovação", e ele pedia que se
   * aprovasse outra vez. Sem fim.
   */
  pendingPeriodization?: PeriodizationProposal;
  /** A que já foi aprovada, com o id gravado — mesmo papel do `resolvedWorkoutProposal`. */
  resolvedPeriodization?: { proposal: PeriodizationProposal; id: string };
  pendingWorkoutProposal?: BulkWorkoutProposal;
  /**
   * A proposta que já foi aprovada, com o que dela foi salvo.
   *
   * `pendingWorkoutProposal` é limpo na aprovação, e precisa ser: enquanto
   * estivesse lá, um segundo clique salvaria os mesmos treinos de novo. Mas
   * jogar a proposta fora deixava a conversa dizendo "treinos aprovados e
   * salvos: A, B, C" com a tela sem nada para mostrar. Aqui ela continua
   * recuperável sem voltar para a fila de decisão.
   */
  resolvedWorkoutProposal?: { proposal: BulkWorkoutProposal; savedTitles: string[] };
  /** Guardadas no servidor: a aprovação salva a cópia, não o que o modelo reemitir. */
  pendingDietPlan?: DietPlanProposal;
  pendingDietMeals?: DietMealsProposal;
  savedDietPlanId?: string;
  /**
   * O plano que o assistente do aluno apresentou, e o que dele foi salvo.
   *
   * `save_plan` gravava o que o modelo reemitia no segundo turno, e não o que
   * o aluno aprovou olhando o cartão — uma periodização de doze semanas com
   * quatro dias tem espaço de sobra para divergir entre as duas versões.
   * Guardar aqui é o que permite salvar a cópia revisada.
   *
   * Sair de `pendingStudentPlan` para `resolvedStudentPlan` é também a trava
   * contra salvar duas vezes: sem fila, um segundo `save_plan` não tem o que
   * gravar.
   */
  pendingStudentPlan?: PlanProposalData;
  resolvedStudentPlan?: { plan: PlanProposalData; periodizationId: string };
  /**
   * As propostas de dieta já aprovadas. Mesmo papel de
   * `resolvedWorkoutProposal`: sair da fila de decisão sem sair da tela.
   * Enquanto ficassem em "pendente", um segundo clique salvaria de novo.
   */
  resolvedDietPlan?: DietPlanProposal;
  resolvedDietMeals?: DietMealsProposal;
}

/**
 * O chat do web também propõe dieta e o plano do aluno — eventos que o
 * orquestrador de treino (`WorkoutSseEvent`, em shared/) não emite. Aqui a
 * união reaproveita o contrato de treino e só acrescenta o que é exclusivo
 * daqui, em vez de redeclarar `text`/`tool_start`/`proposal`/etc.
 */
export type SseEvent =
  | Exclude<WorkoutSseEvent, { type: "saved" }>
  | { type: "diet_plan_proposal"; data: DietPlanProposal }
  | { type: "diet_meals_proposal"; data: DietMealsProposal }
  | { type: "plan_proposal"; data: PlanProposalData }
  | { type: "saved"; entity: "periodization" | "diet_plan"; id: string; name: string };
