import { validateAboutYou } from '..';

const COMPLETO = { age: '29', height: '172', weight: '78', sex: 'Feminino' as const };

describe('validateAboutYou', () => {
  it('lê os números da digitação para o formato da anamnese', () => {
    expect(validateAboutYou(COMPLETO)).toEqual({
      status: 'ready',
      answers: { age: 29, height: 172, weight: 78, gender: 'Feminino' },
    });
  });

  it('aceita a vírgula do teclado do Android no peso', () => {
    const result = validateAboutYou({ ...COMPLETO, weight: '78,5' });
    expect(result).toMatchObject({ status: 'ready', answers: { weight: 78.5 } });
  });

  it('lê altura em metro como centímetro, em vez de mandar corrigir um valor certo', () => {
    const result = validateAboutYou({ ...COMPLETO, height: '1,72' });
    expect(result).toMatchObject({ status: 'ready', answers: { height: 172 } });
  });

  it('com campo vazio, pede para completar sem acusar erro', () => {
    expect(validateAboutYou({ ...COMPLETO, weight: '' }).status).toBe('incomplete');
    expect(validateAboutYou({ ...COMPLETO, sex: null }).status).toBe('incomplete');
  });

  it('fora da faixa, diz o formato esperado com exemplo', () => {
    expect(validateAboutYou({ ...COMPLETO, height: '20' })).toEqual({
      status: 'invalid',
      errors: { height: 'Use centímetros, de 100 a 250. Ex.: 172' },
    });
  });

  it('recusa idade quebrada ou impossível como digitação errada', () => {
    for (const age of ['29,5', '3', '140']) {
      const result = validateAboutYou({ ...COMPLETO, age });
      expect(result.status === 'invalid' && result.errors.age).toMatch(/anos inteiros/);
    }
  });

  /**
   * TRAVA — o Praticante é só para maiores de 18 (ADR-0044). Menor não segue
   * para a triagem nem tem dado de saúde gravado: o Art. 14 pede o melhor
   * interesse do adolescente, e o plano automático não foi pensado para ele.
   */
  it('barra o menor de 18, mesmo com o resto válido', () => {
    for (const age of ['17', '12']) {
      const result = validateAboutYou({ ...COMPLETO, age });
      if (result.status !== 'minor') {
        throw new Error(`MENOR NO PLANO AUTOMÁTICO: idade ${age} seguiu como ${result.status}`);
      }
    }
  });

  it('aceita quem faz 18', () => {
    expect(validateAboutYou({ ...COMPLETO, age: '18' }).status).toBe('ready');
  });

  /**
   * TRAVA — só treino responde só a idade (Art. 6°, III; ADR-0044). O menor para
   * em todo caminho, e quem não terá dieta não entrega peso, altura nem sexo.
   */
  it('só treino: lê só a idade, barra o menor e não guarda o corpo', () => {
    const vazio = { age: '', height: '', weight: '', sex: null };
    expect(validateAboutYou(vazio, 'ageOnly').status).toBe('incomplete');
    if (validateAboutYou({ ...vazio, age: '16' }, 'ageOnly').status !== 'minor') {
      throw new Error('MENOR NO PLANO AUTOMÁTICO: "só treino" deixou passar 16 anos');
    }
    const pronto = validateAboutYou({ ...COMPLETO, age: '29' }, 'ageOnly');
    if (pronto.status !== 'ready' || Object.keys(pronto.answers).join() !== 'age') {
      throw new Error('DADO DESNECESSÁRIO: "só treino" gravou mais que a idade');
    }
  });
});
