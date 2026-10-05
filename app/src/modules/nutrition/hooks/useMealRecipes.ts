import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuthStore } from '@/auth';
import { loadMealRecipeCatalog } from '../services/MealCatalogService';
import { loadMealRecipeContext, type MealRecipeContext } from '../services/mealRecipeContext';
import { getMealPreparation, getMealRecipeOptions } from '../services/mealRecipes';

type ContextState = MealRecipeContext | { status: 'loading' | 'error' };

/** Mantém a escolha só nesta tela/conta. @example const recipes = useMealRecipes(mealId, date); */
export function useMealRecipes(mealId: string, date: string, requireCatalog = true) {
  const studentId = useAuthStore((state) => state.user?.id ?? '');
  const token = useAuthStore((state) => state.session?.access_token ?? '');
  const canReadDiet = useAuthStore((state) => state.abilities?.can('read', 'Diet') ?? false);
  const scope = `${studentId}:${mealId}:${date}:${canReadDiet}`;
  const [revision, setRevision] = useState(0);
  const requestScope = `${scope}:${revision}`;
  const [loaded, setLoaded] = useState<{ scope: string; context: ContextState } | null>(null);
  const [selection, setSelection] = useState<{ scope: string; id: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoaded(null);
      loadMealRecipeContext({ studentId, mealId, date, canReadDiet }).then(
        (context) => {
          if (active) setLoaded({ scope: requestScope, context });
        },
        () => {
          if (active) setLoaded({ scope: requestScope, context: { status: 'error' } });
        }
      );
      return () => {
        active = false;
      };
    }, [studentId, mealId, date, canReadDiet, requestScope])
  );

  const mealContext: ContextState =
    loaded?.scope === requestScope ? loaded.context : { status: 'loading' };
  const catalog = useQuery({
    queryKey: ['meal-recipe-catalog', 1],
    queryFn: () => loadMealRecipeCatalog(token),
    enabled: requireCatalog && mealContext.status === 'ready' && !!token,
    staleTime: 60_000,
    retry: 1,
  });
  const context: ContextState =
    mealContext.status === 'ready' && requireCatalog && !catalog.data
      ? { status: catalog.error || !token ? 'error' : 'loading' }
      : mealContext;
  const items = context.status === 'ready' ? context.items : [];
  const definitions = catalog.data?.recipes ?? [];
  const images = catalog.data?.images ?? [];
  const match = getMealRecipeOptions(items, definitions);
  const selected =
    selection?.scope === scope
      ? (match.options.find((option) => option.id === selection.id) ?? null)
      : null;
  return {
    context,
    match,
    selected,
    images,
    choose: (id: string) => setSelection({ scope, id }),
    retry: () => {
      setRevision((value) => value + 1);
      if (requireCatalog) void catalog.refetch();
    },
    prepare: (recipeId?: string) => {
      const preparation = getMealPreparation(items, recipeId, definitions);
      if (!preparation) return null;
      const definition = definitions.find((recipe) => recipe.id === recipeId);
      return { ...preparation, image: images.find((image) => image.id === definition?.imageId) };
    },
  };
}
