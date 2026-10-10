import type { PersonaTrack } from '@elevapro/shared/data/anamnesisAdaptive';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';
import type { OnboardingGoal } from '../services/onboardingOptions';

interface OnboardingState {
  /** De quem são as respostas: outra conta no mesmo aparelho começa do zero. */
  ownerId: string | null;
  goal: OnboardingGoal | null;
  track: PersonaTrack | null;
  /** Começa o onboarding de `ownerId`, descartando o de outra conta. */
  start: (ownerId: string) => void;
  chooseGoal: (goal: OnboardingGoal) => void;
  chooseTrack: (track: PersonaTrack) => void;
}

const EMPTY = { ownerId: null, goal: null, track: null };

/**
 * As escolhas de antes do consentimento: objetivo e nível.
 *
 * Ficam **só no aparelho** até o aceite de saúde, e por isso só elas: nenhuma
 * resposta de saúde passa por aqui. Do consentimento em diante a resposta vai
 * para o servidor (ADR-0044), e fechar o app retoma de lá.
 *
 * @example useOnboardingStore.getState().chooseGoal('Emagrecimento');
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      start: (ownerId) => {
        if (get().ownerId !== ownerId) set({ ...EMPTY, ownerId });
      },
      chooseGoal: (goal) => set({ goal }),
      chooseTrack: (track) => set({ track }),
    }),
    {
      name: 'onboarding',
      storage: createJSONStorage(() => armazenamentoNoAparelho('onboarding')),
    }
  )
);
