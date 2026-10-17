import { loadSuggestionCopy, suggestedWeightText } from '../loadSuggestionCopy';

describe('o texto da carga sugerida', () => {
  it('subindo: o selo diz quanto, e o motivo diz por quê', () => {
    expect(
      loadSuggestionCopy({ kind: 'increase', weightKg: 12.5, deltaKg: 2.5, reason: 'easy' })
    ).toEqual({
      badge: '+2,5 kg',
      reason: 'foi fácil da última vez',
      icon: 'arrow-up',
      weight: '12,5 kg',
    });
  });

  it('descendo: o selo leva o menos tipográfico', () => {
    expect(
      loadSuggestionCopy({ kind: 'decrease', weightKg: 38, deltaKg: -2, reason: 'hard_twice' })
        .badge
    ).toBe('−2 kg');
  });

  it('mantendo depois de "ok": pede mais repetições', () => {
    expect(loadSuggestionCopy({ kind: 'keep', weightKg: 10, reason: 'ok' })).toMatchObject({
      badge: 'Mantém',
      reason: 'tente mais repetições',
    });
  });

  it('a carga para a sessão sai como a prescrição escreve', () => {
    expect(
      suggestedWeightText({ kind: 'increase', weightKg: 12.5, deltaKg: 2.5, reason: 'easy' })
    ).toBe('12,5');
    expect(suggestedWeightText({ kind: 'add_reps', reps: 1, reason: 'easy' })).toBeNull();
  });
});
