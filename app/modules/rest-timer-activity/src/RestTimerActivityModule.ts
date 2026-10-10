import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { RestAction, RestActionSubscription, RestOnLockScreen } from './types';

type RestTimerEvents = { onAction: () => void };

declare class RestTimerActivityNative extends NativeModule<RestTimerEvents> {
  show(rest: RestOnLockScreen): Promise<void>;
  end(): Promise<void>;
  takeActions(): RestAction[];
}

const native = requireOptionalNativeModule<RestTimerActivityNative>('RestTimerActivity');

/**
 * `native` é nulo no Expo Go e antes do primeiro build nativo com o módulo: o
 * descanso segue na tela do app, só não aparece na tela bloqueada. Nada aqui
 * pode derrubar a sessão de treino.
 */
export default {
  available: native !== null,
  show: (rest: RestOnLockScreen): Promise<void> => native?.show(rest) ?? Promise.resolve(),
  end: (): Promise<void> => native?.end() ?? Promise.resolve(),
  takeActions: (): RestAction[] => native?.takeActions() ?? [],
  onAction: (listener: () => void): RestActionSubscription | null =>
    native?.addListener('onAction', listener) ?? null,
};
