import { useNoticeChoicesStore } from '../noticeChoicesStore';
import { resetNotices } from '../resetNotices';

const mockSchedule = jest.fn();
const mockUpdateWidget = jest.fn();

jest.mock('@/services/notificationService', () => ({
  scheduleDailyNotices: (notices: unknown, options: unknown) => mockSchedule(notices, options),
}));
jest.mock('@/shared/widget', () => ({
  updateTodayWidget: (snapshot: unknown) => mockUpdateWidget(snapshot),
}));

// Art. 6°, VII: no aparelho compartilhado, quem entra depois não pode receber
// o almoço do outro na tela bloqueada nem vê-lo no widget.
describe('sair da conta', () => {
  it('cancela os avisos, apaga o widget e esquece as respostas de quem saiu', async () => {
    useNoticeChoicesStore.getState().skipMeal('2026-10-14', 'almoco-de-quem-saiu');

    await resetNotices();

    if (
      !mockSchedule.mock.calls.some(([notices]) => Array.isArray(notices) && notices.length === 0)
    ) {
      throw new Error('AVISO DE OUTRA PESSOA: os avisos agendados sobreviveram à saída da conta');
    }
    if (!mockUpdateWidget.mock.calls.some(([snapshot]) => snapshot === null)) {
      throw new Error('WIDGET DE OUTRA PESSOA: o retrato do dia sobreviveu à saída da conta');
    }
    expect(useNoticeChoicesStore.getState().skippedMeals).toEqual([]);
  });
});
