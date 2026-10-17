import { averageWeight } from '../bodyWeight';

describe('averageWeight (F9)', () => {
  it('a média da semana, com uma casa', () => {
    expect(averageWeight([77.4, 77.9, 77.8])).toBe(77.7);
  });

  it('pesagem fora da faixa não puxa a média', () => {
    expect(averageWeight([0, 77.4, 774])).toBe(77.4);
  });

  it('sem pesagem válida, nula', () => {
    expect(averageWeight([])).toBeNull();
    expect(averageWeight([Number.NaN, 12])).toBeNull();
  });
});
