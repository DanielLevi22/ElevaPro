/**
 * Balão de notificação in-app, no visual do design system — a única forma de
 * apresentar notificação dentro do app daqui pra frente (Issue #336), seja ela
 * disparada por um sinal (ex: aluno em risco) ou por uma notificação local que
 * chegou com o app em primeiro plano.
 *
 * Mesma arquitetura do `appAlert`: API imperativa porque metade das chamadas
 * nasce fora da árvore React (listener de notificação, checagem no foco da
 * tela); o estado vive num store Zustand e quem desenha é o
 * `<PushBannerHost />`, montado uma vez na raiz.
 *
 * @example
 * showPushBanner({
 *   tone: 'danger',
 *   icon: 'triangle-alert',
 *   title: 'João Vieira não treina há 5 dias',
 *   body: 'Risco de abandono alto.',
 * });
 */
import { type PushBannerRequest, usePushBannerStore } from './store';

export { PushBannerHost } from './PushBannerHost';
export type { PushBannerIcon, PushBannerRequest, PushBannerTone } from './store';
export { usePushBannerStore } from './store';

export const showPushBanner = (request: PushBannerRequest): void => {
  usePushBannerStore.getState().push(request);
};
