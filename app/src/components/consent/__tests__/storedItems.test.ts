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

  it('cita as notas do especialista só para quem tem especialista', () => {
    expect(storedItems(true).some((item) => /notas/i.test(item))).toBe(true);
    expect(storedItems(false).some((item) => /notas/i.test(item))).toBe(false);
  });
});
