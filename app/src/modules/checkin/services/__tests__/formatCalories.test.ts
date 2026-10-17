import { formatKcal, formatKcalDelta } from '../formatCalories';

describe('as calorias na tela', () => {
  it('escreve com o separador de milhar do português', () => {
    expect(formatKcal(3081)).toBe('3.081 kcal');
  });

  it('o selo leva o sinal, com o menos tipográfico', () => {
    expect(formatKcalDelta(-150)).toBe('−150 kcal');
    expect(formatKcalDelta(150)).toBe('+150 kcal');
  });
});
