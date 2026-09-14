import type { AnaliseDoPrato } from '@elevapro/shared';
import { pratoComPorcoes } from '../porcoesDoPrato';

/**
 * "Ajustar porções" do scan: mudar as gramas de um componente recalcula o
 * componente e o prato, na proporção (issue #298, seam 6).
 */

const bowl: AnaliseDoPrato = {
  name: 'Bowl',
  calories: 260,
  protein: 13,
  carbs: 32,
  fat: 12,
  confidence: 0.8,
  components: [
    { name: 'Grão-de-bico', grams: 120, calories: 164, protein: 9, carbs: 27, fat: 3 },
    { name: 'Abacate', grams: 60, calories: 96, protein: 4, carbs: 5, fat: 9 },
  ],
};

describe('prato com porções ajustadas', () => {
  it('sem ajuste, o prato é a soma dos componentes', () => {
    expect(pratoComPorcoes(bowl, {}).macros).toEqual({
      calorias: 260,
      proteina: 13,
      carboidrato: 32,
      gordura: 12,
    });
  });

  it('dobrar as gramas de um componente dobra os macros dele e soma no prato', () => {
    const prato = pratoComPorcoes(bowl, { 1: 120 });

    expect(prato.componentes[1]).toMatchObject({
      grams: 120,
      calories: 192,
      protein: 8,
      carbs: 10,
      fat: 18,
    });
    expect(prato.macros.calorias).toBe(356);
  });

  it('zerar um componente o tira do prato', () => {
    expect(pratoComPorcoes(bowl, { 0: 0 }).macros.calorias).toBe(96);
  });

  // Gramas negativas são toque demais no "−": param em zero.
  it('gramas negativas valem zero', () => {
    expect(pratoComPorcoes(bowl, { 1: -30 }).componentes[1].grams).toBe(0);
  });

  // Resposta antiga do scan, sem componentes: não há o que ajustar, e o prato
  // vale pelos totais que o modelo deu.
  it('sem componentes, vale o total do prato', () => {
    const inteiro = { ...bowl, components: [] };

    expect(pratoComPorcoes(inteiro, {}).macros).toEqual({
      calorias: 260,
      proteina: 13,
      carboidrato: 32,
      gordura: 12,
    });
  });
});
