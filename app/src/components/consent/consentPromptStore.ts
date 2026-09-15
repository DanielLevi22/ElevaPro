import { create } from 'zustand';

interface ConsentPromptState {
  /** Quantas vezes uma tela pediu o aceite. O portão reage à mudança do número. */
  requests: number;
  request: () => void;
}

/**
 * O pedido de consentimento sob demanda: o "Ajustar" do health check reabre a folha
 * do `HealthDataConsentGate`, em vez de uma segunda folha com o mesmo texto — duas
 * cópias do texto de consentimento divergiriam na primeira mudança de política.
 *
 * @example useConsentPromptStore.getState().request();
 */
export const useConsentPromptStore = create<ConsentPromptState>((set) => ({
  requests: 0,
  request: () => set((state) => ({ requests: state.requests + 1 })),
}));
