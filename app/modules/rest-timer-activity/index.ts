import RestTimerActivity from './src/RestTimerActivityModule';

export type { RestAction, RestActionSubscription, RestOnLockScreen } from './src/types';

/**
 * O descanso na tela bloqueada: Live Activity no iOS, notificação fixa no
 * Android. O sistema conta o tempo sozinho; o app só avisa quando o descanso
 * começa, muda ou acaba.
 *
 * Os botões "+15 s" e "Pular" agem na hora, do lado nativo, mesmo com o app
 * suspenso, e ficam guardados até o app ler com `takeRestActions`: a sessão é
 * a fonte da verdade e reaplica o toque com o instante em que ele aconteceu.
 *
 * @example
 * await showRest({ title: 'Descanso · Remada curvada', ... });
 * const sub = onRestAction(() => aplicar(takeRestActions()));
 */
export const showRest = RestTimerActivity.show;
export const endRest = RestTimerActivity.end;
export const takeRestActions = RestTimerActivity.takeActions;
export const onRestAction = RestTimerActivity.onAction;
