import { pushBannerFromNotification } from '../pushBannerFromNotification';

describe('pushBannerFromNotification', () => {
  it('monta o balão a partir do conteúdo e do payload de tom/ícone', () => {
    const balao = pushBannerFromNotification({
      title: '🍽️ Hora da refeição!',
      body: 'Não esqueça: Almoço',
      data: { tone: 'info', icon: 'utensils' },
    });

    expect(balao).toEqual({
      tone: 'info',
      icon: 'utensils',
      title: '🍽️ Hora da refeição!',
      body: 'Não esqueça: Almoço',
    });
  });

  it('devolve null quando não há tom/ícone reconhecido — notificação de outro sistema, não vira balão', () => {
    expect(pushBannerFromNotification({ title: 'x', body: 'y', data: {} })).toBeNull();
    expect(
      pushBannerFromNotification({ title: 'x', body: 'y', data: { tone: 'info' } })
    ).toBeNull();
    expect(
      pushBannerFromNotification({
        title: 'x',
        body: 'y',
        data: { tone: 'roxo', icon: 'utensils' },
      })
    ).toBeNull();
  });

  it('devolve null sem título ou corpo', () => {
    expect(
      pushBannerFromNotification({
        title: null,
        body: 'y',
        data: { tone: 'info', icon: 'utensils' },
      })
    ).toBeNull();
    expect(
      pushBannerFromNotification({
        title: 'x',
        body: null,
        data: { tone: 'info', icon: 'utensils' },
      })
    ).toBeNull();
  });
});
