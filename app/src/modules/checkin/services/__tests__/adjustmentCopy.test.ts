import type { Recalibration } from '@elevapro/shared';
import { adjustmentCopy } from '../adjustmentCopy';

const BASE: Recalibration = {
  verdict: 'weight_above_pace',
  proposedCalories: 2000,
  deltaCalories: -150,
  expectedChangeKg: -0.5,
  actualChangeKg: -0.1,
};

describe('o texto do ajuste da semana', () => {
  it('diz o que o peso fez, o ritmo da meta e o passo proposto', () => {
    const copy = adjustmentCopy(BASE, 'all');
    expect(copy.status.label).toBe('Acima do ritmo');
    expect(copy.reason).toBe(
      'Você perdeu 0,1 kg; o ritmo da sua meta era perder 0,5 kg por semana. Vamos baixar a meta em 150 kcal.'
    );
    expect(copy.proposesChange).toBe(true);
  });

  it('perdendo rápido demais, explica que a meta sobe', () => {
    const copy = adjustmentCopy(
      {
        ...BASE,
        verdict: 'weight_below_pace',
        proposedCalories: 2300,
        deltaCalories: 150,
        actualChangeKg: -1.2,
      },
      'all'
    );
    expect(copy.status.label).toBe('Abaixo do ritmo');
    expect(copy.reason).toContain('Você perdeu 1,2 kg');
    expect(copy.reason).toContain('Vamos subir a meta em 150 kcal.');
  });

  // Regressão: no teto de ganho a tela dizia "mínimo seguro".
  it('no teto seguro, segue igual e diz que é o máximo', () => {
    const copy = adjustmentCopy(
      {
        ...BASE,
        verdict: 'weight_below_pace',
        proposedCalories: 2150,
        deltaCalories: 0,
        guard: 'weekly_gain_cap',
      },
      'all'
    );
    expect(copy.reason).toContain('já está no máximo seguro');
    expect(copy.reason).not.toContain('mínimo');
  });

  it('no piso seguro, segue igual e diz por quê', () => {
    const copy = adjustmentCopy(
      { ...BASE, proposedCalories: 2150, deltaCalories: 0, guard: 'bmr_floor' },
      'all'
    );
    expect(copy.proposesChange).toBe(false);
    expect(copy.reason).toContain('já está no mínimo seguro');
  });

  it('no ritmo, segue igual', () => {
    const copy = adjustmentCopy(
      { ...BASE, verdict: 'on_pace', deltaCalories: 0, actualChangeKg: -0.5 },
      'all'
    );
    expect(copy.status.label).toBe('No ritmo');
    expect(copy.reason).toMatch(/^Tudo no ritmo, seguimos igual\. Você perdeu 0,5 kg/);
  });

  it('com registro parcial, mantém sem culpa', () => {
    const copy = adjustmentCopy(
      { ...BASE, verdict: 'insufficient_data', deltaCalories: 0 },
      'partial'
    );
    expect(copy.status.label).toBe('Dados insuficientes');
    expect(copy.reason).toBe('Com registro parcial mantemos a meta. Registre mais esta semana.');
  });

  it('semana fora do plano não vira corte nem bronca', () => {
    const copy = adjustmentCopy(
      { ...BASE, verdict: 'low_adherence', deltaCalories: 0 },
      'not_followed'
    );
    expect(copy.reason).not.toMatch(/culpa|falhou|errou/i);
    expect(copy.reason).toContain('não mexemos nas calorias');
  });
});
