import type { Food } from '@elevapro/shared';
import type { ItemDoPrato } from '../consumoDoDia';
import { equivalentesDaTroca, ordenarEquivalentes } from '../equivalenciaDaTroca';

/**
 * A troca do kit promete manter a meta de proteína do dia. Então a quantidade
 * do equivalente sai da proteína do item que sai, e o que muda de calorias e
 * proteína é mostrado ao aluno com sinal, depois do arredondamento.
 */

function alimento(over: Partial<Food>): Food {
  return { serving_size: 100, calories: 0, protein: 0, carbs: 0, fat: 0, ...over } as Food;
}

const frango = alimento({ id: 'frango', name: 'Peito de frango', calories: 165, protein: 31 });
const itemDoFrango: ItemDoPrato = { id: 'item-1', quantity: 180, food: frango };

describe('equivalentes da troca', () => {
  it('a quantidade iguala a proteína do item que sai, arredondada a 5 g', () => {
    const tilapia = alimento({ id: 'tilapia', calories: 96, protein: 20 });

    const [equivalente] = equivalentesDaTroca(itemDoFrango, [tilapia]);

    // 180 g de frango = 55,8 g de proteína; 279 g de tilápia, arredondados a 280.
    expect(equivalente.quantidade).toBe(280);
    expect(equivalente.diferencaCalorias).toBe(-28);
    expect(equivalente.diferencaProteina).toBe(0);
  });

  it('as diferenças saem da quantidade arredondada, e não da exata', () => {
    const atum = alimento({ id: 'atum', calories: 116, protein: 26 });

    const [equivalente] = equivalentesDaTroca(itemDoFrango, [atum]);

    // 214,6 g exatos viram 215: 55,9 g de proteína e 249,4 kcal.
    expect(equivalente.quantidade).toBe(215);
    expect(equivalente.diferencaProteina).toBe(0);
    expect(equivalente.diferencaCalorias).toBe(-48);
  });

  it('o próprio alimento não é equivalente dele mesmo', () => {
    expect(equivalentesDaTroca(itemDoFrango, [frango])).toEqual([]);
  });

  it('alimento sem proteína não substitui item com proteína', () => {
    const azeite = alimento({ id: 'azeite', calories: 884, protein: 0 });

    expect(equivalentesDaTroca(itemDoFrango, [azeite])).toEqual([]);
  });

  // 180 g de frango pedem quase 2 kg de brócolis: isso não é troca, é outra refeição.
  it('recusa equivalente que pede mais que o triplo da quantidade original', () => {
    const brocolis = alimento({ id: 'brocolis', calories: 34, protein: 2.8 });

    expect(equivalentesDaTroca(itemDoFrango, [brocolis])).toEqual([]);
  });

  it('item sem proteína troca por calorias', () => {
    const arroz = alimento({ id: 'arroz', calories: 124, protein: 0 });
    const batata = alimento({ id: 'batata', calories: 86, protein: 0 });
    const itemDoArroz: ItemDoPrato = { id: 'item-2', quantity: 150, food: arroz };

    const [equivalente] = equivalentesDaTroca(itemDoArroz, [batata]);

    // 186 kcal de arroz = 216,3 g de batata, arredondados a 215.
    expect(equivalente.quantidade).toBe(215);
    expect(equivalente.diferencaCalorias).toBe(-1);
  });
});

describe('ordem dos equivalentes', () => {
  const tilapia = alimento({ id: 'tilapia', calories: 96, protein: 20 });
  const patinho = alimento({ id: 'patinho', calories: 219, protein: 35.9 });
  const atum = alimento({ id: 'atum', calories: 116, protein: 26 });

  it('por padrão, o mais perto em calorias vem primeiro', () => {
    const lista = ordenarEquivalentes(
      equivalentesDaTroca(itemDoFrango, [tilapia, patinho, atum]),
      'calorias'
    );

    // Tilápia −28 kcal, patinho +42, atum −48.
    expect(lista.map((e) => e.food.id)).toEqual(['tilapia', 'patinho', 'atum']);
  });

  // Com a proteína igualada, a diferença de proteína é sempre perto de zero. O
  // que distingue os equivalentes é quanta proteína cada caloria traz.
  it('por proteína, o mais magro vem primeiro', () => {
    const lista = ordenarEquivalentes(
      equivalentesDaTroca(itemDoFrango, [tilapia, patinho, atum]),
      'proteina'
    );

    // Proteína por 100 kcal: atum 22,4, tilápia 20,8, patinho 16,4.
    expect(lista.map((e) => e.food.id)).toEqual(['atum', 'tilapia', 'patinho']);
  });
});
