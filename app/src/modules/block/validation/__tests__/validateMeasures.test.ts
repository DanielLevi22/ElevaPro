import { validateMeasures } from '..';

describe('as medidas da reavaliação', () => {
  it('o peso é obrigatório; a cintura, não', () => {
    expect(validateMeasures({ weight: '', waist: '82' })).toMatchObject({ status: 'incomplete' });
    expect(validateMeasures({ weight: '77,6', waist: '' })).toEqual({
      status: 'ready',
      weightKg: 77.6,
      waistCm: null,
    });
  });

  it('fora da faixa, o erro diz o formato esperado', () => {
    const result = validateMeasures({ weight: '776', waist: '8' });
    expect(result).toMatchObject({ status: 'invalid' });
    if (result.status !== 'invalid') return;
    expect(result.errors.weight).toContain('de 30 a 300');
    expect(result.errors.waist).toContain('centímetros');
  });
});
