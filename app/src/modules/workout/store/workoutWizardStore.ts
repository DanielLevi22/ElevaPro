import { create } from 'zustand';

/**
 * Estado do wizard de criação de treino (passos Estrutura → Montagem →
 * Revisão), compartilhado entre as três telas.
 *
 * Guarda só o que ainda não foi salvo — uma vez que o passo 1 grava a
 * periodização e a fase, o resto do wizard lê pelo `periodizationId`/`phaseId`
 * daqui, não por um cache próprio dos dados já persistidos.
 */
interface WorkoutWizardState {
  studentId: string | null;
  studentName: string | null;
  planName: string;
  objective: string;
  durationWeeks: number;
  frequencyPerWeek: number;
  split: string;
  /** A sessão de chat da IA, uma vez resolvida — reaproveitada em toda troca. */
  aiSessionId: string | null;
  /** Preenchidos quando o passo 1 termina, manual ou pela IA. */
  periodizationId: string | null;
  phaseId: string | null;
  notifyOnPublish: boolean;

  startFor: (studentId: string, studentName: string) => void;
  setPlanName: (value: string) => void;
  setObjective: (value: string) => void;
  setDurationWeeks: (value: number) => void;
  setFrequencyPerWeek: (value: number) => void;
  setSplit: (value: string) => void;
  setAiSessionId: (value: string) => void;
  setCreatedStructure: (periodizationId: string, phaseId: string) => void;
  setNotifyOnPublish: (value: boolean) => void;
  reset: () => void;
}

const ESTADO_INICIAL = {
  studentId: null,
  studentName: null,
  planName: '',
  objective: '',
  durationWeeks: 8,
  frequencyPerWeek: 3,
  split: '',
  aiSessionId: null,
  periodizationId: null,
  phaseId: null,
  notifyOnPublish: true,
} satisfies Omit<
  WorkoutWizardState,
  | 'startFor'
  | 'setPlanName'
  | 'setObjective'
  | 'setDurationWeeks'
  | 'setFrequencyPerWeek'
  | 'setSplit'
  | 'setAiSessionId'
  | 'setCreatedStructure'
  | 'setNotifyOnPublish'
  | 'reset'
>;

export const useWorkoutWizardStore = create<WorkoutWizardState>((set) => ({
  ...ESTADO_INICIAL,

  startFor: (studentId, studentName) => set({ ...ESTADO_INICIAL, studentId, studentName }),

  setPlanName: (planName) => set({ planName }),
  setObjective: (objective) => set({ objective }),
  setDurationWeeks: (durationWeeks) => set({ durationWeeks }),
  setFrequencyPerWeek: (frequencyPerWeek) => set({ frequencyPerWeek }),
  setSplit: (split) => set({ split }),
  setAiSessionId: (aiSessionId) => set({ aiSessionId }),
  setCreatedStructure: (periodizationId, phaseId) => set({ periodizationId, phaseId }),
  setNotifyOnPublish: (notifyOnPublish) => set({ notifyOnPublish }),

  reset: () => set(ESTADO_INICIAL),
}));
