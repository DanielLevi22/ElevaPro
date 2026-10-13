import type { RestAction, RestActionSubscription, RestOnLockScreen } from './types';

/** Web não tem tela bloqueada: o descanso fica só na tela do app. */
export default {
  available: false,
  show: (_rest: RestOnLockScreen): Promise<void> => Promise.resolve(),
  end: (): Promise<void> => Promise.resolve(),
  takeActions: (): RestAction[] => [],
  onAction: (_listener: () => void): RestActionSubscription | null => null,
};
