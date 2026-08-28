import { getDayOfWeek, getLocalDateISOString } from '../dateUtils';

/**
 * `getLocalDateISOString` é a chave de "hoje" para treino executado, sessão de
 * cardio e resumo do dia. Se ela devolvesse a data em UTC, um aluno treinando
 * às 21h em São Paulo (UTC-3) gravaria a sessão no dia seguinte — o treino
 * some do dia certo e conta duas vezes na semana errada.
 */
describe('getLocalDateISOString', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const freezeAt = (iso: string) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(iso));
  };

  it('devolve o dia local, não o dia UTC, quando o fuso já virou', () => {
    // 2026-03-10T02:30Z é 2026-03-09 23:30 em São Paulo: ainda dia 9.
    freezeAt('2026-03-10T02:30:00.000Z');
    const offsetMinutes = new Date().getTimezoneOffset();
    const expected = offsetMinutes > 0 ? '2026-03-09' : '2026-03-10';

    expect(getLocalDateISOString()).toBe(expected);
  });

  it('devolve só a data, sem a parte de hora', () => {
    freezeAt('2026-08-28T15:00:00.000Z');

    expect(getLocalDateISOString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDayOfWeek', () => {
  it('usa a convenção do JS: domingo é 0', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-30T12:00:00.000Z')); // domingo

    expect(getDayOfWeek()).toBe(new Date().getDay());
    expect(getDayOfWeek()).toBeGreaterThanOrEqual(0);
    expect(getDayOfWeek()).toBeLessThanOrEqual(6);

    jest.useRealTimers();
  });
});
