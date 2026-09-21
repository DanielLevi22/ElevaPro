import { showPushBanner, usePushBannerStore } from '..';

describe('pushBanner', () => {
  beforeEach(() => {
    usePushBannerStore.setState({ current: null, queue: [] });
  });

  it('mostra o balão na hora quando não há nada em cena', () => {
    showPushBanner({ tone: 'danger', icon: 'triangle-alert', title: 'Risco', body: 'Mensagem' });

    expect(usePushBannerStore.getState().current).toMatchObject({
      tone: 'danger',
      title: 'Risco',
    });
  });

  // Dois eventos no mesmo tick não podem fazer o segundo sobrescrever o
  // primeiro sem o especialista nunca ter visto o primeiro.
  it('enfileira o segundo balão em vez de sobrescrever o primeiro', () => {
    showPushBanner({ tone: 'danger', icon: 'triangle-alert', title: 'Primeiro', body: 'a' });
    showPushBanner({ tone: 'success', icon: 'triangle-alert', title: 'Segundo', body: 'b' });

    expect(usePushBannerStore.getState().current).toMatchObject({ title: 'Primeiro' });
    expect(usePushBannerStore.getState().queue).toHaveLength(1);

    usePushBannerStore.getState().dismiss();

    expect(usePushBannerStore.getState().current).toMatchObject({ title: 'Segundo' });
    expect(usePushBannerStore.getState().queue).toHaveLength(0);
  });

  it('esvazia ao fechar o último', () => {
    showPushBanner({ tone: 'info', icon: 'triangle-alert', title: 'Único', body: 'a' });
    usePushBannerStore.getState().dismiss();

    expect(usePushBannerStore.getState().current).toBeNull();
  });
});
