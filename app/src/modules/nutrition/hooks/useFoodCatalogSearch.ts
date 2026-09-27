import { createNutritionService, type Food } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';

const nutrition = createNutritionService(supabase);

/** Espera parar de digitar antes de ir ao banco. */
const TYPING_PAUSE_MS = 300;
const RESULTS = 20;
const MIN_QUERY_LENGTH = 2;

export interface FoodCatalogSearch {
  results: Food[];
  searching: boolean;
}

/**
 * A busca no catálogo de alimentos: o texto digitado manda; sem texto, a
 * categoria escolhida. É a mesma busca do aluno (#298) e do especialista
 * montando a refeição (#337).
 *
 * @example const { results, searching } = useFoodCatalogSearch(consulta, 'proteina');
 */
export function useFoodCatalogSearch(query: string, category: string | null): FoodCatalogSearch {
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    setSearching(true);
    const pause = setTimeout(() => {
      search(query.trim(), category)
        .then((found) => active && setResults(found))
        .catch(() => active && setResults([]))
        .finally(() => active && setSearching(false));
    }, TYPING_PAUSE_MS);
    return () => {
      active = false;
      clearTimeout(pause);
    };
  }, [query, category]);

  return { results, searching };
}

async function search(query: string, category: string | null): Promise<Food[]> {
  if (query.length >= MIN_QUERY_LENGTH) {
    const found = await nutrition.searchFoods(query, 0, RESULTS);
    return category ? found.filter((food) => food.category === category) : found;
  }
  if (category) return nutrition.fetchFoodsByCategory(category, RESULTS);
  return nutrition.fetchFoods(RESULTS);
}
