import { useWeeklyReportStore } from '../weeklyReportStore';

describe('useWeeklyReportStore', () => {
  // O "já vi" é por pessoa: no aparelho compartilhado, abrir o relatório de
  // uma não some com o cartão da outra.
  it('o relatório visto é marcado por pessoa e por semana', () => {
    useWeeklyReportStore.getState().markSeen('ana', '2026-10-05');
    useWeeklyReportStore.getState().markSeen('bia', '2026-09-28');
    useWeeklyReportStore.getState().markSeen('ana', '2026-10-12');

    expect(useWeeklyReportStore.getState().seenWeek).toEqual({
      ana: '2026-10-12',
      bia: '2026-09-28',
    });
  });
});
