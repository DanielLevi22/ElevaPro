import { useLocalSearchParams } from 'expo-router';
import { CookingScreen } from '@/modules/nutrition/routes/index';
import { getLocalDateISOString } from '@/utils/dateUtils';

export default function CookingRoute() {
  const { mealId, date, recipeId } = useLocalSearchParams<{
    mealId?: string;
    date?: string;
    recipeId?: string;
  }>();
  return (
    <CookingScreen
      mealId={mealId ?? ''}
      date={date ?? getLocalDateISOString()}
      recipeId={recipeId}
    />
  );
}
