import {
  DIET_STRATEGIES,
  type DietPlanPreferences,
  type DietPlanType,
  type DietStrategyType,
} from '@elevapro/shared';
import { create } from 'zustand';

/**
 * O rascunho dos passos 1 e 2 da criação de dieta (#337): ponto de partida,
 * estratégia, nome, metas e preferências. Guarda só o que ainda não foi
 * gravado — ao sair do passo 2 o plano nasce rascunho no banco, e dali em
 * diante o wizard lê pelo `planId`.
 */

export type DietStartingPoint = 'strategy' | 'copy' | 'assistant';
export type Macro = 'protein' | 'carbs' | 'fat';
export type MacroPercent = Record<Macro, number>;
type GoalSuggestion = { targetCalories: number; macros: Record<Macro, number> };

interface StartOptions {
  actorId: string;
  studentId: string;
  studentName: string;
  /** Plano do próprio Praticante: não há aluno para quem enviar. */
  ownPlan: boolean;
}

interface DietWizardState {
  actorId: string | null;
  generation: number;
  studentId: string | null;
  studentName: string | null;
  ownPlan: boolean;
  startingPoint: DietStartingPoint;
  strategy: DietStrategyType;
  planName: string;
  targetCalories: number;
  macroPercent: MacroPercent;
  /** Vigência a partir de hoje: o fim do plano. */
  durationWeeks: number;
  preferences: DietPlanPreferences;
  planId: string | null;
  aiSessionId: string | null;
  goalsInitialized: boolean;
  goalsEdited: boolean;
  preferencesEdited: boolean;

  startFor: (options: StartOptions) => void;
  setStartingPoint: (value: DietStartingPoint) => void;
  setStrategy: (value: DietStrategyType) => void;
  setPlanName: (value: string) => void;
  setTargetCalories: (value: number) => void;
  setDurationWeeks: (value: number) => void;
  setMacroPercent: (macro: Exclude<Macro, 'carbs'>, value: number) => void;
  applySuggestion: (suggestion: GoalSuggestion) => void;
  /** Preenche uma vez por criação, sem substituir decisões ao retomar o passo 2. */
  initializeGoals: (
    studentId: string,
    suggestion: GoalSuggestion | null,
    restrictions: DietPlanPreferences['dietary_restrictions']
  ) => void;
  setPreferences: (value: DietPlanPreferences) => void;
  setCreatedPlan: (planId: string) => void;
  setAiSessionId: (value: string) => void;
  planType: () => DietPlanType;
  macroGrams: () => Record<Macro, number>;
  reset: () => void;
}

const BALANCED: MacroPercent = { protein: 30, carbs: 40, fat: 30 };

const INITIAL = {
  actorId: null,
  studentId: null,
  studentName: null,
  ownPlan: false,
  startingPoint: 'strategy' as DietStartingPoint,
  strategy: 'standard' as DietStrategyType,
  planName: '',
  targetCalories: 2000,
  macroPercent: BALANCED,
  // Um mês, o mesmo padrão do web.
  durationWeeks: 4,
  preferences: {
    dietary_restrictions: [],
    meals_per_day: null,
    allows_supplements: null,
    free_meal_days: [],
  } as DietPlanPreferences,
  planId: null,
  aiSessionId: null,
  goalsInitialized: false,
  goalsEdited: false,
  preferencesEdited: false,
};

// Carbo fecha a conta: proteína e gordura são decisão, o carbo é o que sobra.
function balanced(protein: number, fat: number): MacroPercent {
  const cappedFat = Math.min(fat, 100 - protein);
  return { protein, fat: cappedFat, carbs: 100 - protein - cappedFat };
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

// Proteína e carbo valem 4 kcal/g; gordura, 9 kcal/g.
const KCAL_PER_GRAM: Record<Macro, number> = { protein: 4, carbs: 4, fat: 9 };

export const useDietWizardStore = create<DietWizardState>((set, get) => ({
  ...INITIAL,
  generation: 0,

  startFor: ({ actorId, studentId, studentName, ownPlan }) =>
    set({ ...INITIAL, actorId, studentId, studentName, ownPlan, generation: get().generation + 1 }),
  setStartingPoint: (startingPoint) => set({ startingPoint }),
  setStrategy: (strategy) => set({ strategy }),
  setPlanName: (planName) => set({ planName }),
  setTargetCalories: (targetCalories) =>
    set({ targetCalories: Math.max(0, targetCalories), goalsEdited: true }),
  setDurationWeeks: (durationWeeks) =>
    set({ durationWeeks: Math.max(1, Math.round(durationWeeks)) }),

  setMacroPercent: (macro, value) => {
    const current = get().macroPercent;
    const next = clampPercent(value);
    set({
      goalsEdited: true,
      macroPercent:
        macro === 'protein' ? balanced(next, current.fat) : balanced(current.protein, next),
    });
  },

  applySuggestion: ({ targetCalories, macros }) => {
    const percentOf = (macro: Macro) =>
      targetCalories > 0
        ? clampPercent(((macros[macro] * KCAL_PER_GRAM[macro]) / targetCalories) * 100)
        : 0;
    set({ targetCalories, macroPercent: balanced(percentOf('protein'), percentOf('fat')) });
  },

  initializeGoals: (studentId, suggestion, restrictions) => {
    const current = get();
    if (current.studentId !== studentId || current.goalsInitialized) return;
    if (suggestion && !current.goalsEdited) current.applySuggestion(suggestion);
    set({
      goalsInitialized: true,
      preferences: current.preferencesEdited
        ? current.preferences
        : { ...current.preferences, dietary_restrictions: restrictions },
    });
  },

  setPreferences: (preferences) => set({ preferences, preferencesEdited: true }),
  setCreatedPlan: (planId) => set({ planId }),
  setAiSessionId: (aiSessionId) => set({ aiSessionId }),

  planType: () => DIET_STRATEGIES[get().strategy].planType,

  macroGrams: () => {
    const { targetCalories, macroPercent } = get();
    const grams = (macro: Macro) =>
      Math.round((targetCalories * macroPercent[macro]) / 100 / KCAL_PER_GRAM[macro]);
    return { protein: grams('protein'), carbs: grams('carbs'), fat: grams('fat') };
  },

  reset: () => set({ ...INITIAL, generation: get().generation + 1 }),
}));
