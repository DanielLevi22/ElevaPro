import { storedItems } from '../storedItems';

/**
 * TRAVA — o consentimento diz o que é guardado (Art. 8°, §4° e Art. 9°).
 *
 * A `1.8` existe por duas linhas: a medida corporal que o próprio aluno registra
 * (0056) e as notas do especialista sobre o progresso. Sem elas, o aluno aceita uma
 * lista que não corresponde ao que o app grava. A nota só aparece para quem tem
 * especialista: dizer ao Praticante que alguém escreve sobre ele descreveria um
 * tratamento que não acontece.
 */
describe('storedItems', () => {
  it('cita a medida corporal registrada pelo aluno ou pelo especialista', () => {
    for (const hasSpecialist of [true, false]) {
      const listed = storedItems(hasSpecialist).join(' | ');
      if (!/medidas corporais/i.test(listed)) {
        throw new Error(
          `CONSENTIMENTO SEM A MEDIDA: a lista não cita a medida corporal — ${listed}`
        );
      }
    }
  });

  /**
   * A `1.9` existe por esta linha (#365): a anamnese é consentimento explícito
   * (Art. 11, I) e nunca esteve na lista, e o onboarding do Praticante passou a
   * gravar o resultado da triagem. A condição marcada não é guardada (ADR-0044),
   * e a lista diz isso para o aceite ser sobre o que de fato acontece.
   */
  it('cita a anamnese e a triagem, e diz que a condição marcada não é guardada', () => {
    for (const hasSpecialist of [true, false]) {
      const listed = storedItems(hasSpecialist).join(' | ');
      if (!/anamnese/i.test(listed) || !/triagem/i.test(listed)) {
        throw new Error(
          `CONSENTIMENTO SEM A ANAMNESE: a lista não cita anamnese e triagem — ${listed}`
        );
      }
      if (!/condição .*não é guardada/i.test(listed)) {
        throw new Error(
          `PROMESSA AUSENTE: a lista não diz que a condição de saúde marcada não é guardada — ${listed}`
        );
      }
    }
  });

  /**
   * A `1.10` existe por esta linha (#376, Art. 8°, §4° e Art. 9°): o check-in
   * guarda como foi a semana e o histórico dos ajustes de meta. Sem ela, o
   * aceite é genérico para o que a 0088 grava, e autorização genérica é nula.
   */
  it('o aceite não omite o check-in nem os ajustes de meta', () => {
    for (const hasSpecialist of [true, false]) {
      const listed = storedItems(hasSpecialist).join(' | ');
      if (!/check-in/i.test(listed) || !/ajustes de meta/i.test(listed)) {
        throw new Error(
          `CONSENTIMENTO SEM O CHECK-IN: a lista não cita o check-in e os ajustes — ${listed}`
        );
      }
    }
  });

  it('cita as notas do especialista só para quem tem especialista', () => {
    expect(storedItems(true).some((item) => /notas/i.test(item))).toBe(true);
    expect(storedItems(false).some((item) => /notas/i.test(item))).toBe(false);
  });
});
