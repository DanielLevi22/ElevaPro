import { comparisonRows, keptNote } from '../comparisonCopy';

const comparison = {
  trainingDays: { before: 3, after: 4 },
  newExercises: ['Leg press', 'Puxada frontal', 'Supino reto', 'Remada baixa'],
  keptExercises: 2,
  calories: { before: 2000, after: 1950 },
};

describe('o que muda no próximo bloco (B5)', () => {
  it('dias, exercícios novos e a meta, com o selo da diferença', () => {
    expect(comparisonRows(comparison)).toEqual([
      expect.objectContaining({
        title: 'Dias por semana',
        before: '3',
        after: '4',
        badge: '+1 dia',
      }),
      expect.objectContaining({
        title: 'Exercícios novos',
        after: 'Leg press, Puxada frontal, Supino reto e mais 1',
        badge: '+4',
      }),
      expect.objectContaining({ title: 'Meta diária', after: '1.950 kcal', badge: '−50 kcal' }),
    ]);
  });

  it('sem dieta, a meta não aparece; sem diferença, o selo diz igual', () => {
    const rows = comparisonRows({
      ...comparison,
      trainingDays: { before: 3, after: 3 },
      calories: { before: null, after: null },
    });
    expect(rows.map((row) => row.title)).toEqual(['Dias por semana', 'Exercícios novos']);
    expect(rows[0].badge).toBe('igual');
  });

  it('diz o que continua, para o bloco novo não parecer recomeço', () => {
    expect(keptNote(comparison)).toBe(
      'Continuam 2 exercícios do bloco anterior, com as cargas que você conquistou.'
    );
  });
});
