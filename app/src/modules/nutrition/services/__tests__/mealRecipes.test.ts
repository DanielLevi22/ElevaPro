import type { RecipeDefinition } from '@elevapro/shared';
import type { ItemDoPrato } from '../consumoDoDia';
import { getMealRecipeOptions as match, getMealPreparation as prepare } from '../mealRecipes';

const catalog: RecipeDefinition[] = require('../../../../../../web/src/modules/nutrition/services/recipes/catalog.json');
const getMealRecipeOptions = (items: readonly ItemDoPrato[]) => match(items, catalog);
const getMealPreparation = (items: readonly ItemDoPrato[], recipeId?: string) =>
  prepare(items, recipeId, catalog);

function ingredient(name: string, quantity: number, unit = 'g'): ItemDoPrato {
  return {
    id: name,
    quantity,
    unit,
    food: { name, serving_size: 100, calories: 100, protein: 10, carbs: 10, fat: 2 },
  };
}

it('oferece pratos distintos com as porções originais, sem adicionar alimentos', () => {
  const meal = [
    ingredient('Peito de frango cozido', 120),
    ingredient('Batata-doce cozida', 180),
    ingredient('Maçã', 1, 'un'),
  ];
  const result = getMealRecipeOptions(meal);
  expect(result.options.map((option) => option.id)).toEqual([
    'sweet-potato-chicken',
    'sweet-potato-mash',
  ]);
  expect(result.options[0].ingredients.map((item) => item.label)).toEqual([
    '120 g de Peito de frango cozido',
    '180 g de Batata-doce cozida',
    '1 un de Maçã',
  ]);
  expect(meal[0].quantity).toBe(120);
});

it('não esconde carne crua como acompanhamento de um prato pronto', () => {
  const result = getMealRecipeOptions([
    ingredient('Iogurte natural', 170),
    ingredient('Aveia em flocos', 30),
    ingredient('Banana nanica', 100),
    ingredient('Peito de frango cru', 100),
  ]);
  expect(result.options).toHaveLength(0);
});

it('permite preparar a refeição atual sem escolher um prato e recusa receita incompatível', () => {
  const meal = [ingredient('Ovo inteiro cozido', 100), ingredient('Iogurte natural', 170)];
  expect(getMealPreparation(meal)?.title).toBe('Preparo da refeição');
  expect(getMealPreparation(meal, 'egg-yogurt')?.title).toBe('Ovos cozidos com iogurte');
  expect(getMealPreparation(meal, 'egg-sandwich')).toBeNull();
});

it('não aceita unidade incompatível nem um ingrediente escondido dentro do nome', () => {
  const valid = [
    ingredient('Peito de frango cozido', 120),
    ingredient('Batata-doce cozida', 180),
    ingredient('Maçã', 1, 'un'),
  ];
  expect(getMealRecipeOptions([{ ...valid[0], unit: 'ml' }, ...valid.slice(1)]).options).toEqual(
    []
  );
  expect(
    getMealRecipeOptions([ingredient('Frango empanado com queijo', 120), ...valid.slice(1)]).options
  ).toEqual([]);
});

it('cobre lanche, almoço e ceia com os alimentos conhecidos do catálogo', () => {
  const snack = getMealRecipeOptions([
    ingredient('Iogurte grego natural', 170),
    ingredient('Aveia em flocos', 30),
    ingredient('Banana nanica', 100),
  ]);
  expect(snack.options.map((option) => option.id)).toEqual(['yogurt-bowl', 'overnight-oats']);
  expect(snack.options[0].sides).toEqual([]);
  const lunch = getMealRecipeOptions([
    ingredient('Peito de frango cozido', 150),
    ingredient('Arroz branco cozido', 180),
    ingredient('Feijão carioca cozido', 100),
    ingredient('Brócolis cozido', 100),
  ]);
  expect(lunch.options.map((option) => option.id)).toEqual(['chicken-rice', 'chicken-rice-bowl']);
  expect(
    getMealRecipeOptions([
      ingredient('Ovo inteiro cozido', 100),
      ingredient('Iogurte natural', 170),
    ]).options.map((option) => option.id)
  ).toEqual(['egg-yogurt']);
});

it('usa os ovos já cozidos do catálogo real sem sugerir omelete', () => {
  const result = getMealRecipeOptions([
    ingredient('Ovo inteiro cozido', 150),
    ingredient('Aveia em flocos', 30),
    ingredient('Banana nanica', 100),
  ]);
  expect(result.options.map((option) => option.id)).toEqual(['banana-oat-porridge']);
  expect(result.options[0].steps.map((step) => step.instruction).join(' ')).not.toContain(
    'ovos crus'
  );
});

it('oferece café da manhã completo e mantém banana e café como acompanhamentos', () => {
  const result = getMealRecipeOptions([
    ingredient('Ovo inteiro cru', 3, 'un'),
    ingredient('Pão integral', 2, 'fatias'),
    ingredient('Banana nanica', 1, 'un'),
    ingredient('Café sem açúcar', 100, 'ml'),
  ]);
  expect(result.options.map((option) => option.id)).toEqual(['egg-sandwich', 'scrambled-toast']);
  expect(result.options[0].sides.map((item) => item.name)).toEqual([
    'Banana nanica',
    'Café sem açúcar',
  ]);
});

it('oferece variações do almoço da captura preservando inclusive os 10 g de azeite', () => {
  const meal = [
    ingredient('Arroz branco cozido', 200),
    ingredient('Feijão carioca cozido', 100),
    ingredient('Frango (peito grelhado)', 200),
    ingredient('Brócolis cozido', 100),
    ingredient('Azeite de oliva', 10),
  ];
  const options = getMealRecipeOptions(meal).options;
  expect(options.map((option) => option.id)).toEqual([
    'chicken-strips-rice',
    'shredded-chicken-rice',
    'bean-cream-chicken',
  ]);
  for (const option of options) {
    expect(option.ingredients.map(({ quantity }) => quantity)).toEqual([200, 100, 200, 100, 10]);
    const preparation = getMealPreparation(meal, option.id);
    expect(preparation?.steps.map((step) => step.instruction).join(' ')).toContain('azeite');
  }
});

it('não transforma café em pó, fruta seca ou farinha em alimentos prontos do prato', () => {
  for (const name of ['Café em pó', 'Banana passa', 'Farinha de aveia']) {
    expect(getMealPreparation([ingredient(name, 30)])).toBeNull();
  }
});
