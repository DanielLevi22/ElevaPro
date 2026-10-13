import { validateCheckIn } from '..';

describe('o check-in da semana', () => {
  it('fica pronto com a resposta e o peso, lendo a vírgula do teclado', () => {
    expect(validateCheckIn({ logging: 'all', weight: '77,6' })).toEqual({
      status: 'ready',
      logging: 'all',
      weightKg: 77.6,
    });
  });

  it('pede a resposta do registro antes de tudo', () => {
    expect(validateCheckIn({ logging: null, weight: '77,6' })).toMatchObject({
      status: 'incomplete',
      hint: 'Conte como foi o registro da semana',
    });
  });

  it('pede o peso de quem não tem especialista', () => {
    expect(validateCheckIn({ logging: 'all', weight: ' ' }).status).toBe('incomplete');
  });

  it('peso fora da faixa diz o formato esperado', () => {
    expect(validateCheckIn({ logging: 'all', weight: '778' })).toMatchObject({
      status: 'invalid',
      error: 'Use quilos, de 30 a 300, com vírgula. Ex.: 77,6',
    });
  });

  it('o Aluno envia sem peso, mesmo que algo tenha sido digitado', () => {
    expect(validateCheckIn({ logging: 'partial', weight: '80' }, 'withoutWeight')).toEqual({
      status: 'ready',
      logging: 'partial',
      weightKg: null,
    });
  });
});
