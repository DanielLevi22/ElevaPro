import { deadlineLabel, weekEndsAt } from '../rankingWeek';

// Datas em UTC; Brasília é UTC−3. A semana do banco vai de segunda 00h00 a
// domingo 23h59 no horário de Brasília (`ranking_week_start`, migration 0059).
describe('semana do ranking', () => {
  it('segunda 00h00 e domingo 23h59 de Brasília fecham na mesma segunda', () => {
    const mondayStart = new Date('2026-09-14T03:00:00Z');
    const sundayEnd = new Date('2026-09-21T02:59:00Z');
    expect(weekEndsAt(mondayStart).toISOString()).toBe('2026-09-21T03:00:00.000Z');
    expect(weekEndsAt(sundayEnd).toISOString()).toBe('2026-09-21T03:00:00.000Z');
  });

  // Em UTC já é segunda, mas em Brasília ainda é domingo à noite.
  it('domingo às 22h de Brasília ainda é a semana que termina', () => {
    expect(weekEndsAt(new Date('2026-09-21T01:00:00Z')).toISOString()).toBe(
      '2026-09-21T03:00:00.000Z'
    );
  });

  it('atravessa a virada do ano', () => {
    expect(weekEndsAt(new Date('2026-12-31T15:00:00Z')).toISOString()).toBe(
      '2027-01-04T03:00:00.000Z'
    );
  });
});

describe('prazo do ranking', () => {
  it('diz os dias e as horas que faltam', () => {
    expect(deadlineLabel(new Date('2026-09-18T12:30:00Z'))).toBe('Encerra em 2 dias e 14 horas');
  });

  it('usa o singular', () => {
    expect(deadlineLabel(new Date('2026-09-20T02:00:00Z'))).toBe('Encerra em 1 dia e 1 hora');
  });

  it('omite as horas quando a conta é exata', () => {
    expect(deadlineLabel(new Date('2026-09-18T03:00:00Z'))).toBe('Encerra em 3 dias');
  });

  it('no domingo, o último dia, diz que encerra hoje', () => {
    expect(deadlineLabel(new Date('2026-09-20T03:00:00Z'))).toBe('Encerra hoje às 23h59');
    expect(deadlineLabel(new Date('2026-09-21T02:59:00Z'))).toBe('Encerra hoje às 23h59');
  });
});
