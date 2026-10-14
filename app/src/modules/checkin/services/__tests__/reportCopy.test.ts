import type { WeeklyReport } from '@elevapro/shared';
import {
  adjustmentLine,
  recordLine,
  reportHeadline,
  reportNumbers,
  weekRange,
} from '../reportCopy';

const report = (extra: Partial<WeeklyReport> = {}): WeeklyReport => ({
  weekStart: '2026-10-05',
  weekEnd: '2026-10-11',
  tone: 'complete',
  workouts: { done: 4, planned: 4 },
  diet: { daysOnTarget: 6, daysLogged: 7, daysPlanned: 7 },
  weightChange: -0.4,
  records: [],
  adjustments: [],
  streakWeeks: 3,
  ...extra,
});

describe('o texto do relatório da semana', () => {
  it('a semana que vira o mês leva o mês dos dois lados', () => {
    expect(weekRange('2026-09-28', '2026-10-04')).toBe('28 set a 4 out');
    expect(weekRange('2026-10-05', '2026-10-11')).toBe('5 a 11 out');
  });

  it('semana completa conta os exercícios em que ficou mais forte', () => {
    const records = [
      { exerciseId: 's', name: 'Supino', weight: 12.5, previousWeight: 10, date: '2026-10-07' },
    ];

    expect(reportHeadline(report({ records }), 'Marina')).toMatchObject({
      title: 'Semana completa, Marina',
      sub: 'Você treinou tudo e ficou mais forte em 1 exercício.',
    });
  });

  // R1a: a semana difícil não aponta falta. Se alguém trocar o texto por uma
  // cobrança, este teste lembra que a decisão foi de produto.
  it('semana difícil não leva bronca, e a dieta conta os dias registrados', () => {
    const hard = report({
      tone: 'hard',
      workouts: { done: 1, planned: 4 },
      diet: { daysOnTarget: 0, daysLogged: 2, daysPlanned: 7 },
    });

    expect(reportHeadline(hard, 'Marina').sub).not.toMatch(/falt|deveria|precisa|abaixo/i);
    expect(reportNumbers(hard).diet).toEqual({ value: '2/7', sub: 'dias registrados' });
  });

  it('os números do topo: treinos, dias na meta e o peso com o menos tipográfico', () => {
    expect(reportNumbers(report())).toEqual({
      workouts: { value: '4/4', sub: 'treinos feitos' },
      diet: { value: '6/7', sub: 'dias na meta' },
      weight: { value: '−0,4', sub: 'kg na semana' },
    });
  });

  it('sem pesagem, um traço — nunca zero', () => {
    expect(reportNumbers(report({ weightChange: null })).weight.value).toBe('—');
  });

  it('o recorde mostra o antes e o depois', () => {
    expect(
      recordLine({ exerciseId: 's', name: 'Supino', weight: 12.5, previousWeight: 10, date: 'x' })
    ).toEqual({ title: 'Supino', sub: '10 kg → 12,5 kg' });
  });

  it('o ajuste de meta diz o antes, o depois e o motivo', () => {
    expect(
      adjustmentLine({
        kind: 'calories',
        before: 2150,
        after: 2000,
        reason: 'weight_above_pace',
        at: '2026-10-06',
      })
    ).toEqual({
      title: 'Meta 2.150 → 2.000 kcal',
      sub: 'Aprovada no check-in: o peso ficou acima do ritmo.',
    });
  });
});
