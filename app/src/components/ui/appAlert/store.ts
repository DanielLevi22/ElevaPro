import { create } from 'zustand';
import type { StatusModalType } from '../StatusModal';

export type ConfirmModalType = 'danger' | 'warning' | 'info' | 'success';

/** Aviso de um botão só: deu certo, deu erro, faltou preencher. */
export interface StatusRequest {
  kind: 'status';
  title: string;
  message: string;
  type: StatusModalType;
  buttonText?: string;
  /** Roda quando o aviso fecha — o `onPress` do botão único do Alert nativo. */
  onDismiss?: () => void;
}

/** Escolha entre duas ações. */
export interface ConfirmRequest {
  kind: 'confirm';
  title: string;
  message: string;
  type: ConfirmModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  /** Ação do botão secundário, quando ele é uma escolha e não um "cancelar". */
  onCancel?: () => void;
}

export type AlertRequest = StatusRequest | ConfirmRequest;

interface AppAlertState {
  current: AlertRequest | null;
  /**
   * O `Alert.alert` nativo enfileira: dois avisos disparados no mesmo tick
   * aparecem um depois do outro. Sem fila aqui, o segundo sobrescreveria o
   * primeiro e o usuário perderia a mensagem.
   */
  queue: AlertRequest[];
  push: (request: AlertRequest) => void;
  dismiss: () => void;
}

export const useAppAlertStore = create<AppAlertState>((set) => ({
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
