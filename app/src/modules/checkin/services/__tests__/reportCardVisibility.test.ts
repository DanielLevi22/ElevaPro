import type { WeeklyReport } from '@elevapro/shared';
import { showReportCard } from '../reportCardVisibility';

const report = (extra: Partial<WeeklyReport> = {}): WeeklyReport => ({
  weekStart: '2026-10-05',
  weekEnd: '2026-10-11',
  tone: 'complete',
  workouts: { done: 4, planned: 4 },
  diet: null,
  weightChange: null,
  records: [],
  adjustments: [],
  streakWeeks: 1,
  ...extra,
});

describe('o cartão do relatório na tela inicial', () => {
  it('aparece do domingo até terça, e some na quarta', () => {
    expect(showReportCard(report(), '2026-10-11', null)).toBe(true);
    expect(showReportCard(report(), '2026-10-13', null)).toBe(true);
    expect(showReportCard(report(), '2026-10-14', null)).toBe(false);
  });

  it('some depois de aberto', () => {
    expect(showReportCard(report(), '2026-10-12', '2026-10-05')).toBe(false);
  });

  it('semana vazia não vira cartão', () => {
    expect(showReportCard(report({ tone: 'empty' }), '2026-10-11', null)).toBe(false);
  });
});
