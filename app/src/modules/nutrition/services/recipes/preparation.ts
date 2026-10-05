import type { MealCookingStep, RecipeIngredient } from './types';

/** Guia separado do cardápio: não escolhe outro prato nem muda quantidades. */
export function currentMealSteps(ingredients: RecipeIngredient[]): MealCookingStep[] | null {
  if (ingredients.some((item) => item.state === 'unknown')) return null;
  if (
    ingredients.some(
      (item) => item.state === 'raw' && item.family !== 'egg' && item.family !== 'vegetable'
    )
  )
    return null;
  return [
    {
      instruction:
        'Separe os alimentos nas quantidades da lista. Os pesos crus e cozidos não são intercambiáveis.',
    },
    ...ingredients.map(ingredientStep),
    {
      instruction:
        'Monte sua refeição com todos os itens da lista. Preparar não registra consumo; confirme depois no detalhe da refeição.',
    },
  ];
}

function ingredientStep(item: RecipeIngredient): MealCookingStep {
  if (item.family === 'olive_oil')
    return {
      instruction: `Meça ${item.label} uma única vez e distribua sobre os alimentos ao finalizar. Esse é todo o azeite previsto; não acrescente óleo extra.`,
    };
  if (item.family === 'egg' && item.state === 'raw')
    return {
      instruction: `Bata ${item.label}. Cozinhe em frigideira antiaderente até firmar por inteiro, sem óleo adicional.`,
      timerSeconds: 180,
    };
  if (item.family === 'egg')
    return {
      instruction: `Sirva ${item.label} já cozido. Não transforme a porção cozida em peso de ovo cru.`,
    };
  if (item.family === 'whey')
    return {
      instruction: `Prepare ${item.label} com água, seguindo o rótulo. Não acrescente leite se ele não estiver na refeição.`,
    };
  if (item.state === 'cooked')
    return {
      instruction: `Separe ${item.label} já preparado. Aqueça por inteiro com um pouco de água se necessário, sem acrescentar óleo.`,
      timerSeconds: 180,
    };
  if (item.family === 'oats')
    return {
      instruction: `Sirva ${item.label}. Pode hidratar em água; não adicione leite ou iogurte fora da lista.`,
    };
  if (item.family === 'vegetable')
    return {
      instruction: `Higienize ${item.name} antes de separar ${item.quantity} ${item.unit} para servir conforme indicado na refeição.`,
    };
  return {
    instruction: `Separe e sirva ${item.label}, sem acrescentar ingredientes fora da lista.`,
  };
}
