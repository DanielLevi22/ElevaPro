import { create } from 'zustand';

/**
 * Tom visual do balão — cor por urgência, no vocabulário que o design system já
 * usa (`BriefingTone`, em `@elevapro/shared`), mais `info` para o que não é
 * alerta (ex: lembrete de refeição).
 */
export type PushBannerTone = 'danger' | 'warning' | 'success' | 'info';

/**
 * Ícones que o balão sabe desenhar. Cresce um a um, conforme cada fonte de
 * notificação é ligada — nunca um nome solto: o Metro não faz tree-shaking de
 * `lucide-react-native`, então cada chave aqui precisa de um import próprio no
 * `PushBannerHost`.
 */
export type PushBannerIcon = 'triangle-alert' | 'utensils' | 'dumbbell';

/** Um balão pedido para aparecer. Sem ação nenhuma — só informa, some ao toque. */
export interface PushBannerRequest {
  tone: PushBannerTone;
  icon: PushBannerIcon;
  title: string;
  body: string;
}

interface PushBannerState {
  current: PushBannerRequest | null;
  /**
   * Dois eventos no mesmo tick não podem fazer o segundo sobrescrever o
   * primeiro — mesma razão de fila do `appAlert`.
   */
  queue: PushBannerRequest[];
  push: (request: PushBannerRequest) => void;
  dismiss: () => void;
}

export const usePushBannerStore = create<PushBannerState>((set) => ({
  current: null,
  queue: [],
  push: (request) =>
    set((state) =>
      state.current === null ? { current: request } : { queue: [...state.queue, request] }
    ),
  dismiss: () =>
    set((state) => ({
      current: state.queue[0] ?? null,
      queue: state.queue.slice(1),
    })),
}));
