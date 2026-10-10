import type { OnboardingPlanPending } from '@elevapro/shared';
import { create } from 'zustand';

interface PlanDraftState {
  plan: OnboardingPlanPending | null;
  setPlan: (plan: OnboardingPlanPending | null) => void;
}

/**
 * O plano gerado em O8, até a pessoa aprovar em O9.
 *
 * Só em memória, de propósito: tem meta, macros e refeições, que são dado de
 * saúde, e a cópia que vale está no servidor. Fechar o app e voltar gera de novo.
 *
 * @example usePlanDraftStore.getState().setPlan(plano);
 */
export const usePlanDraftStore = create<PlanDraftState>()((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
}));
