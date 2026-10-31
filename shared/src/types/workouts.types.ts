import type { SetPlan } from "../setPlan";
export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced";
export type TrainingStatus = "planned" | "active" | "completed";
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type PeriodizationObjective =
  | "hypertrophy"
  | "strength"
  | "endurance"
  | "weight_loss"
  | "conditioning"
  | "general_fitness";

/**
 * Os objetivos de uma periodização, na ordem em que o formulário os oferece.
 *
 * Lista única porque cada plataforma tinha a sua: o web gravava `hypertrophy`
 * e o mobile gravava o texto digitado ("Hipertrofia"). Um não lia o que o
 * outro escrevia.
 *
 * @example PERIODIZATION_OBJECTIVES.map(({ value, label }) => <Chip key={value}>{label}</Chip>)
 */
export const PERIODIZATION_OBJECTIVES: ReadonlyArray<{
  readonly value: PeriodizationObjective;
  readonly label: string;
}> = [
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "strength", label: "Força" },
  { value: "endurance", label: "Resistência" },
  { value: "weight_loss", label: "Emagrecimento" },
  { value: "conditioning", label: "Condicionamento" },
  { value: "general_fitness", label: "Saúde Geral" },
];

/**
 * O rótulo de um objetivo gravado, ou o próprio texto quando não é da lista.
 *
 * Periodização antiga do mobile guarda texto livre; mostrar o que foi digitado
 * é melhor do que esconder o objetivo atrás de um rótulo genérico.
 *
 * @example periodizationObjectiveLabel("strength") // "Força"
 */
export function periodizationObjectiveLabel(objective: string | null): string | null {
  if (!objective) return null;
  return PERIODIZATION_OBJECTIVES.find((item) => item.value === objective)?.label ?? objective;
}

/**
 * O objetivo gravado, quando é um dos 6 — `null` para o texto livre antigo.
 *
 * O formulário de edição só oferece os 6; sem esta checagem, um cast
 * deixava "Hipertrofia" digitado passar como se fosse um valor da lista.
 *
 * @example knownPeriodizationObjective("strength") // "strength"
 * @example knownPeriodizationObjective("Hipertrofia") // null
 */
export function knownPeriodizationObjective(
  objective: string | null,
): PeriodizationObjective | null {
  return PERIODIZATION_OBJECTIVES.find((item) => item.value === objective)?.value ?? null;
}

/**
 * A letra de uma ficha: "Treino B" → "B", "Superior" → "S".
 *
 * A divisão cria fichas "Treino A", "Treino B"…; ler só a primeira letra do
 * título dava "T" para todas, e o web mostrava a divisão "TT".
 *
 * @example workoutLetterOf("Treino D") // "D"
 */
export function workoutLetterOf(title: string): string {
  return title
    .replace(/^treino\s+/i, "")
    .charAt(0)
    .toUpperCase();
}

/**
 * A divisão da fase pelas fichas que ela tem, na ordem.
 *
 * @example workoutSplitOf([{ title: "Treino A" }, { title: "Treino B" }]) // "AB"
 */
export function workoutSplitOf(workouts: ReadonlyArray<{ title: string }>): string {
  return workouts.map((workout) => workoutLetterOf(workout.title)).join("");
}

/**
 * O vocabulário do catálogo de exercícios, em um lugar só.
 *
 * Estava espalhado: o banco tinha os valores no CHECK, o coach tinha a lista
 * dentro do serviço de IA, e o painel de admin tinha um campo de texto livre
 * com placeholder "ex: Peito" — que gravava `Peito` e nunca mais era achado
 * pela busca do coach, que procurava `peito`. Vocabulário fechado só fecha se
 * quem escreve e quem lê usarem a mesma lista.
 */
export const EXERCISE_MUSCLE_GROUPS = [
  "peito",
  "costas",
  "ombro",
  "biceps",
  "triceps",
  "pernas",
  "gluteos",
  "abdomen",
  "cardio",
] as const;

/**
 * O nome de cada grupo como a pessoa lê. Mora ao lado da lista porque o painel do
 * especialista e a evolução do aluno (#312) mostram o mesmo grupo, e o banco guarda
 * o identificador sem acento.
 */
export const MUSCLE_GROUP_LABELS: Record<(typeof EXERCISE_MUSCLE_GROUPS)[number], string> = {
  peito: "Peito",
  costas: "Costas",
  ombro: "Ombro",
  biceps: "Bíceps",
  triceps: "Tríceps",
  pernas: "Pernas",
  gluteos: "Glúteos",
  abdomen: "Abdômen",
  cardio: "Cardio",
};

/** Onde o exercício dá para ser executado. Fechado por CHECK na 0042. */
export const EXERCISE_VENUES = ["academia", "casa", "ambos"] as const;

/** Que trabalho o exercício é — `muscle_group` continua dizendo onde no corpo. */
export const EXERCISE_CATEGORIES = [
  "forca",
  "cardio",
  "alongamento",
  "mobilidade",
  "postural",
  "estabilizacao",
] as const;

export type ExerciseMuscleGroup = (typeof EXERCISE_MUSCLE_GROUPS)[number];
export type ExerciseVenue = (typeof EXERCISE_VENUES)[number];
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  venue: ExerciseVenue;
  category: ExerciseCategory;
  description: string | null;
  video_url: string | null;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
}

/** Como a troca de exercício vale (#365, 6d). */
export type ExerciseSwapScope = "today" | "always" | "less";

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
  /** As séries prescritas uma a uma (#431): a prescrição inteira do item. */
  set_plan: SetPlan;
  created_at: string;
  exercise?: Exercise;
}

export interface Workout {
  id: string;
  specialist_id: string | null;
  student_id: string | null;
  training_plan_id: string | null;
  title: string;
  description: string | null;
  muscle_group: string | null;
  difficulty: WorkoutDifficulty | null;
  day_of_week: DayOfWeek | null;
  created_at: string;
  updated_at: string;
  exercises?: WorkoutExercise[];
  exercises_count?: number;
}

/**
 * O plano completo para exportar: a periodização, e cada fase com os treinos
 * dela e os exercícios de cada treino.
 */
export interface FullPeriodization {
  periodization: Periodization;
  phases: { plan: TrainingPlan; workouts: Workout[] }[];
}

export interface TrainingPlan {
  id: string;
  periodization_id: string;
  name: string;
  status: TrainingStatus;
  // NOT NULL no banco desde a `0024`/`0025`. Enquanto eram nuláveis aqui, o
  // código tratava ausência de data como caso normal e mandava `null` no
  // insert — que o banco recusa.
  start_date: string;
  end_date: string;
  order_index: number;
  created_at: string;
  workouts_count?: number;
}

export interface Periodization {
  id: string;
  specialist_id: string;
  student_id: string;
  name: string;
  objective: string | null;
  status: TrainingStatus;
  // NOT NULL no banco desde a `0024`/`0025`. Enquanto eram nuláveis aqui, o
  // código tratava ausência de data como caso normal e mandava `null` no
  // insert — que o banco recusa.
  start_date: string;
  end_date: string;
  /** Por que acabou (0099, 0100); nulo enquanto ativa ou de antes do #376. */
  end_reason?: PlanEndReason | null;
  created_at: string;
  updated_at: string;
  student?: { id: string; full_name: string | null; email: string };
  training_plans_count?: number;
}

/** Por que o plano acabou: fim do bloco, trocado por outro, ou mudado antes do fim. */
export type PlanEndReason = "block_completed" | "replaced" | "changed_early";

export interface WorkoutSession {
  id: string;
  student_id: string;
  workout_id: string | null;
  started_at: string;
  completed_at: string | null;
  /** PSE de 1 a 10. Use `sensacaoDaPse`/`formatPse` para exibir — a escala é única. */
  perceived_exertion: number | null;
  /** Texto do aluno, e só dele. Dado sensível de saúde (Art. 11). */
  notes: string | null;
  session_type: WorkoutSessionType;
  /** Nulos na musculação e em todo cardio anterior à `0035`. */
  duration_seconds: number | null;
  active_calories: number | null;
  /** Modalidade do cardio. Na musculação o nome vem da prescrição. */
  activity_name: string | null;
  /**
   * Medidas da corrida, derivadas do GPS e do acelerômetro no aparelho.
   * Nulas quando não houve leitura — quem nega a permissão de localização
   * corre de verdade e termina sem distância, e zero diria que ficou parado.
   *
   * A série de coordenadas que produziu estes números não é gravada em lugar
   * nenhum (issue #278).
   */
  distance_meters: number | null;
  avg_pace_seconds_per_km: number | null;
  avg_cadence_spm: number | null;
  /**
   * Quando o aluno corrigiu o próprio feedback (Art. 18, III). Nulo enquanto
   * nunca foi corrigido. Não existe versão anterior guardada, de propósito.
   */
  feedback_edited_at: string | null;
  created_at: string;
}

/**
 * O que o aluno pode reescrever da própria sessão: a declaração, nunca a
 * medida.
 *
 * O tipo é a mesma fronteira que a `0036` desenha no banco por privilégio de
 * coluna. Não é redundância: sem ele, `updateSessionFeedback` aceitaria
 * `completed_at` em tempo de compilação e só o Postgres reclamaria, com um
 * 42501 em runtime que ninguém lê.
 */
export interface UpdateSessionFeedbackInput {
  /** PSE de 1 a 10. `null` remove a avaliação. */
  perceived_exertion?: number | null;
  /**
   * `null` ou string vazia apagam a observação e mantêm a sessão — é o Art. 18,
   * VI aplicado só à parte consentida. Quem chama é responsável por não gravar
   * texto sem consentimento vigente.
   */
  notes?: string | null;
}

export interface WorkoutSessionExercise {
  id: string;
  session_id: string;
  workout_exercise_id: string | null;
  created_at: string;
}

/**
 * Uma série executada.
 *
 * Prescrito e executado são campos distintos de propósito: comparar o que foi
 * pedido com o que foi feito é o que torna a evolução mensurável. Gravar o
 * executado nos dois destrói essa informação.
 */
export interface WorkoutSessionSet {
  id: string;
  session_exercise_id: string;
  set_index: number;
  reps_prescribed: string | null;
  reps_actual: number | null;
  weight_prescribed: number | null;
  weight_actual: number | null;
  rest_prescribed: number | null;
  rest_actual: number | null;
  completed: boolean;
  skipped: boolean;
  /** `false` em aquecimento e preparação: não soma volume (0107, #431). */
  counts_toward_volume: boolean;
  created_at: string;
}

/**
 * Uma sessão no histórico do aluno, com o título da prescrição e a FC média.
 *
 * A FC vem por junção com `workout_session_vitals`, e não por coluna, porque a
 * base legal é outra: a RLS daquela tabela exige consentimento vigente. Para o
 * especialista de um aluno que revogou, ela volta nula enquanto o resto da
 * sessão continua visível — o comportamento que a `0049` desenhou.
 */
export interface SessaoDoHistorico {
  id: string;
  student_id: string;
  workout_id: string | null;
  started_at: string;
  completed_at: string | null;
  /** PSE de 1 a 10. Use `sensacaoDaPse`/`formatPse` para exibir. */
  perceived_exertion: number | null;
  /** Texto do aluno, e só dele. Dado sensível de saúde (Art. 11). */
  notes: string | null;
  feedback_edited_at: string | null;
  session_type: WorkoutSessionType;
  duration_seconds: number | null;
  active_calories: number | null;
  distance_meters: number | null;
  avg_pace_seconds_per_km: number | null;
  avg_heart_rate: number | null;
  activity_name: string | null;
  workout: { title: string | null } | null;
  created_at: string;
}

/**
 * A última execução de um treino, série a série — o que o pré-início mostra
 * ("Último: 12 ago · volume 4,0 t") e o que a sessão compara para achar
 * evolução.
 */
export interface SessaoComSeries {
  id: string;
  completed_at: string | null;
  exercises: {
    workout_exercise_id: string | null;
    sets: (Pick<WorkoutSessionSet, "set_index" | "reps_actual" | "weight_actual" | "completed"> &
      Partial<Pick<WorkoutSessionSet, "counts_toward_volume">>)[];
  }[];
}

// Input types

export interface CreateExerciseInput {
  name: string;
  muscle_group?: string;
  description?: string;
  video_url?: string;
}

export interface CreateWorkoutInput {
  specialist_id?: string | null;
  student_id?: string | null;
  training_plan_id?: string | null;
  title: string;
  description?: string | null;
  muscle_group?: string | null;
  difficulty?: WorkoutDifficulty | null;
  day_of_week?: DayOfWeek | null;
}

export interface UpdateWorkoutInput {
  title?: string;
  description?: string | null;
  muscle_group?: string | null;
  difficulty?: WorkoutDifficulty | null;
  day_of_week?: DayOfWeek | null;
  training_plan_id?: string | null;
}

export interface CreatePeriodizationInput {
  specialist_id?: string;
  student_id: string;
  name: string;
  objective?: string;
  /**
   * Obrigatórias: `training_periodizations.start_date` e `end_date` são NOT
   * NULL desde a migration `0024`. Enquanto eram opcionais aqui, o serviço
   * mandava `null` e o banco recusava o insert — criar periodização sem data
   * falhava sempre, e o tipo dizia que estava tudo bem.
   */
  start_date: string;
  end_date: string;
}

export interface UpdatePeriodizationInput {
  name?: string;
  objective?: string;
  status?: TrainingStatus;
  start_date?: string;
  end_date?: string;
}

export interface CreateTrainingPlanInput {
  periodization_id: string;
  name: string;
  /** Obrigatórias pelo mesmo motivo de `CreatePeriodizationInput`. */
  start_date: string;
  end_date: string;
  order_index?: number;
}

export interface UpdateTrainingPlanInput {
  name?: string;
  status?: TrainingStatus;
  start_date?: string;
  end_date?: string;
  order_index?: number;
}

/** Cardio e musculação são a mesma linha de `workout_sessions`. Ver migration 0035. */
export type WorkoutSessionType = "strength" | "cardio";

export interface CreateWorkoutSessionInput {
  student_id: string;
  /**
   * Nulo no cardio: a sessão avulsa não tem prescrição. Até a `0035` ela
   * apontava para uma linha sintética de `workouts` criada só para dar um
   * título ao join.
   */
  workout_id?: string | null;
  started_at: string;
  completed_at?: string | null;
  /** PSE de 1 a 10, como o aluno respondeu no fim da sessão. */
  perceived_exertion?: number;
  /**
   * Só o que o aluno digitou. Dado sensível (Art. 11) — quem chama é
   * responsável por não gravar sem consentimento vigente.
   */
  notes?: string;
  session_type?: WorkoutSessionType;
  /** Cardio apenas: medidos durante a sessão, não derivados do relógio. */
  duration_seconds?: number | null;
  active_calories?: number | null;
  /**
   * Corrida apenas: derivados no aparelho. Execução de contrato, ao contrário
   * da frequência cardíaca, que é Art. 11 e vai por `saveSessionVitals`.
   */
  distance_meters?: number | null;
  avg_pace_seconds_per_km?: number | null;
  avg_cadence_spm?: number | null;
  /** Cardio apenas: a modalidade que o aluno escolheu. */
  activity_name?: string | null;
}

/** Uma série como a tela de execução a conhece. */
export interface SaveSessionSetInput {
  reps_prescribed?: string | null;
  reps_actual?: number | null;
  weight_prescribed?: number | null;
  weight_actual?: number | null;
  rest_prescribed?: number | null;
  rest_actual?: number | null;
  completed?: boolean;
  skipped?: boolean;
  /** `false` em aquecimento e preparação: a série existe, mas não soma volume (#431). */
  counts_toward_volume?: boolean;
}

export interface SaveSessionExerciseInput {
  workout_exercise_id?: string | null;
  /** Exercício efetivamente feito, quando difere do prescrito. */
  exercise_id?: string | null;
  /** "Fácil", "Ok" ou "Difícil" depois da última série; nulo quando pulou (#376). */
  effort?: "easy" | "ok" | "hard" | null;
  sets: SaveSessionSetInput[];
}
