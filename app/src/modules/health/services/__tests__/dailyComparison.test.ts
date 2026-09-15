import type { HealthDailyMetric } from '@elevapro/shared';
import { compareWithBaseline, lastSevenDays } from '../dailyComparison';

function day(date: string, fields: Partial<HealthDailyMetric> = {}): HealthDailyMetric {
  return {
    id: date,
    student_id: 's1',
    date,
    steps: 0,
    active_calories: 0,
    sleep_minutes: null,
    resting_heart_rate: null,
    readiness_score: null,
    readiness_version: null,
    synced_at: `${date}T12:00:00Z`,
    created_at: `${date}T12:00:00Z`,
    ...fields,
  };
}

describe('comparação com a média do próprio Student', () => {
  it('mede hoje contra a média dos dias anteriores, arredondada', () => {
    expect(compareWithBaseline(470, [420, 440, 430])).toEqual({ average: 430, difference: 40 });
  });

  // Média de dois dias tem cara de medição e não é uma: sem base, a diferença some
  // em vez de aparecer zerada.
  it('sem 3 dias de base, ou sem leitura de hoje, não há comparação', () => {
    expect(compareWithBaseline(470, [420, null, 430])).toBeNull();
    expect(compareWithBaseline(null, [420, 440, 430])).toBeNull();
  });
});

describe('a semana das barras', () => {
  // Dia sem linha no banco entra como vazio, e não some: sete barras com um buraco
  // dizem "não leu na quarta", e seis barras juntas mentiriam o calendário.
  it('devolve os 7 dias até hoje, na ordem do calendário, com os vazios no lugar', () => {
    const days = [
      day('2026-09-15', { sleep_minutes: 432 }),
      day('2026-09-13', { sleep_minutes: 400 }),
    ];
    const week = lastSevenDays(days, new Date(2026, 8, 15), (item) => item.sleep_minutes);

    expect(week.map((item) => item.date)).toEqual([
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
    ]);
    expect(week.map((item) => item.value)).toEqual([null, null, null, null, 400, null, 432]);
    expect(week[6].label).toBe('T');
  });
});
