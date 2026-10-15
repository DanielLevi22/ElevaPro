import { useLightWeekStore } from '@/shared/lightWeek';
import { useNoticeChoicesStore } from '../noticeChoicesStore';
import { useNoticePreferencesStore } from '../noticePreferencesStore';
import { resetNotices } from '../resetNotices';

const mockClearAll = jest.fn();
const mockUpdateWidget = jest.fn();

jest.mock('@/services/notificationService', () => ({
  clearAllNotices: () => mockClearAll(),
}));
jest.mock('@/shared/widget', () => ({
  updateTodayWidget: (snapshot: unknown) => mockUpdateWidget(snapshot),
}));

// Art. 6°, VII: no aparelho compartilhado, quem entra depois não pode receber
// o almoço do outro na tela bloqueada, nem vê-lo no widget, nem herdar o que
// ele escolheu.
describe('sair da conta', () => {
  it('cancela todos os avisos, apaga o widget e esquece o que era de quem saiu', async () => {
    useNoticeChoicesStore.getState().skipMeal('2026-10-14', 'almoco-de-quem-saiu');
    useNoticePreferencesStore.getState().update({ hideDetails: false, dailyLog: true });
    useLightWeekStore.getState().start('2026-10-14');

    await resetNotices();

    if (mockClearAll.mock.calls.length === 0) {
      throw new Error('AVISO DE OUTRA PESSOA: os avisos agendados sobreviveram à saída da conta');
    }
    if (!mockUpdateWidget.mock.calls.some(([snapshot]) => snapshot === null)) {
      throw new Error('WIDGET DE OUTRA PESSOA: o retrato do dia sobreviveu à saída da conta');
    }
    expect(useNoticeChoicesStore.getState().skippedMeals).toEqual([]);
    // O padrão volta: detalhes escondidos, e o lembrete das 20h desligado.
    expect(useNoticePreferencesStore.getState()).toMatchObject({
      hideDetails: true,
      dailyLog: false,
    });
    expect(useLightWeekStore.getState().until).toBeNull();
  });
});
