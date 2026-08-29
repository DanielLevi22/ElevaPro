import type { DietMeal, DietMealItem } from '@elevapro/shared';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { fetchBff, lerRespostaBff } from '@/shared/bff';

export interface ShoppingListItem {
  name: string;
  quantity: string;
  checked: boolean;
}

export interface ShoppingCategory {
  category: string;
  items: ShoppingListItem[];
  icon?: string;
}

export interface CookingStep {
  step: number;
  instruction: string;
  timerSeconds?: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Hortifruti: [
    'banana',
    'maçã',
    'alface',
    'tomate',
    'batata',
    'cenoura',
    'fruta',
    'legume',
    'verdura',
    'uva',
    'morango',
    'abacate',
    'limão',
    'mamão',
    'laranja',
    'cebola',
    'alho',
  ],
  'Carnes & Proteínas': [
    'frango',
    'carne',
    'ovo',
    'peixe',
    'patinho',
    'peito',
    'filé',
    'boi',
    'suíno',
    'bife',
    'acém',
    'músculo',
    'tilápia',
    'salmão',
    'atum',
  ],
  'Laticínios & Frios': [
    'leite',
    'queijo',
    'iogurte',
    'whey',
    'requeijão',
    'mussarela',
    'prato',
    'ricota',
    'cotage',
    'manteiga',
  ],
  Mercearia: [
    'arroz',
    'feijão',
    'macarrão',
    'aveia',
    'pão',
    'azeite',
    'farinha',
    'açúcar',
    'sal',
    'tempero',
    'bolacha',
    'biscoito',
    'café',
    'granola',
    'mel',
  ],
  Bebidas: ['água', 'suco', 'refrigerante', 'chá'],
  Suplementos: ['creatina', 'multivitamínico', 'omega', 'pre-treino', 'beta'],
};

function getToken(): string {
  const token = useAuthStore.getState().session?.access_token;
  if (!token) throw new Error('Authentication required');
  return token;
}

export const ShoppingListService = {
  generateShoppingList: async (
    meals: DietMeal[],
    mealItemsRecord: Record<string, DietMealItem[]>,
    durationDays = 7
  ): Promise<ShoppingCategory[]> => {
    const rawMap = new Map<string, { quantity: number; unit: string }>();

    for (const meal of meals) {
      const items = mealItemsRecord[meal.id] ?? [];
      for (const item of items) {
        if (!item.food) continue;
        const key = item.food.name;
        const current = rawMap.get(key) ?? { quantity: 0, unit: item.unit };
        rawMap.set(key, {
          quantity: current.quantity + item.quantity * durationDays,
          unit: item.unit,
        });
      }
    }

    if (rawMap.size === 0) return [];

    const categorized: Record<string, ShoppingListItem[]> = {};
    rawMap.forEach((data, name) => {
      const category = ShoppingListService.categorizeItem(name);
      if (!categorized[category]) categorized[category] = [];
      categorized[category].push({
        name,
        quantity: `${data.quantity.toFixed(1)} ${data.unit}`,
        checked: false,
      });
    });

    return Object.entries(categorized)
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  },

  categorizeItem: (itemName: string): string => {
    const lower = itemName.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((k) => lower.includes(k))) return category;
    }
    return 'Outros';
  },

  generateCookingSteps: async (mealName: string, ingredients: string[]): Promise<CookingStep[]> => {
    const { response, url } = await fetchBff(
      '/api/ai/nutrition/recipe',
      { mealName, ingredients },
      { token: getToken() }
    );

    if (!response.ok) {
      return [
        {
          step: 1,
          instruction: 'Não foi possível gerar a receita com a IA no momento.',
          timerSeconds: 0,
        },
        {
          step: 2,
          instruction: 'Por favor, tente novamente em alguns instantes.',
          timerSeconds: 0,
        },
      ];
    }

    return lerRespostaBff<CookingStep[]>(response, url);
  },

  askAssistant: async (
    categories: ShoppingCategory[],
    promptType: 'recipes' | 'analysis' | 'tips' | 'meal_prep' | 'cooking_guide'
  ): Promise<string> => {
    const { response, url } = await fetchBff(
      '/api/ai/nutrition/assistant',
      { categories, promptType },
      { token: getToken() }
    );

    // Sem `catch`: a frase fixa que morava aqui era a mesma para segredo de
    // bypass recusado, variável ausente, timeout e recusa da rota. Quem mostra
    // decide; quem busca não inventa desculpa.
    const data = await lerRespostaBff<{ response?: string }>(response, url);
    if (!response.ok) throw new Error('A IA recusou a chamada.');
    return data.response ?? 'Não consegui gerar uma resposta no momento.';
  },
};
