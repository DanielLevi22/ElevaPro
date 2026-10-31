import type { CatalogDish } from '@elevapro/shared';
import type { ItemDoPrato } from '../consumoDoDia';
import { dishPreparation, matchCatalogDishes } from '../mealRecipes';

const QUINOA = '11111111-1111-4111-8111-111111111111';
const TOFU = '22222222-2222-4222-8222-222222222222';
const KALE = '33333333-3333-4333-8333-333333333333';

function item(foodId: string, name: string, quantity: number): ItemDoPrato {
  return {
    id: `item-${name}`,
    quantity,
    unit: 'g',
    food: { id: foodId, name, serving_size: 100, calories: 100, protein: 10, carbs: 10, fat: 2 },
  };
}

function dish(id: string, foodIds: string[]): CatalogDish {
  return { id, title: `Prato ${id}`, imageUrl: `https://cdn.test/${id}.jpg`, foodIds };
}

const meal = [item(QUINOA, 'Quinoa cozida', 120), item(TOFU, 'Tofu', 100)];

it('oferece só pratos cujos alimentos estão todos na refeição, o completo primeiro', () => {
  const options = matchCatalogDishes(meal, [
    dish('parcial', [QUINOA]),
    dish('alheio', [QUINOA, KALE]),
    dish('completo', [TOFU, QUINOA]),
  ]);
  expect(options.map((option) => [option.id, option.exact])).toEqual([
    ['completo', true],
    ['parcial', false],
  ]);
  expect(options[1].sides.map((side) => side.label)).toEqual(['100 g de Tofu']);
});

it('mantém as porções do aluno na lista do prato, sem alterar quantidades', () => {
  const [option] = matchCatalogDishes(meal, [dish('completo', [QUINOA, TOFU])]);
  expect(option.ingredients.map((ingredient) => ingredient.label)).toEqual([
    '120 g de Quinoa cozida',
    '100 g de Tofu',
  ]);
  expect(meal[0].quantity).toBe(120);
});

it('não casa alimento sem identificador nem prato de refeição vazia', () => {
  const semId: ItemDoPrato = { ...meal[0], food: { ...meal[0].food!, id: undefined } };
  expect(matchCatalogDishes([semId], [dish('a', [QUINOA])])).toEqual([]);
  expect(matchCatalogDishes([], [dish('a', [QUINOA])])).toEqual([]);
});

it('prato com alimento fora das famílias conhecidas recebe o guia genérico com a foto', () => {
  const [option] = matchCatalogDishes(meal, [dish('parcial', [QUINOA])]);
  const preparation = dishPreparation(meal, option);
  expect(preparation.image).toEqual({ url: 'https://cdn.test/parcial.jpg' });
  expect(preparation.steps.map((step) => step.instruction)).toEqual([
    'Separe os alimentos nas quantidades da lista. Os pesos crus e cozidos não são intercambiáveis.',
    'Prepare 120 g de Quinoa cozida do jeito que você já faz, sem acrescentar óleo, molho ou outro alimento fora da lista.',
    'Sirva à parte: 100 g de Tofu.',
    'Monte o prato como na foto, com todos os itens da lista. Preparar não registra consumo; confirme depois no detalhe da refeição.',
  ]);
});
