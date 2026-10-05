import { useLocalSearchParams } from 'expo-router';
import { MealRecipeScreen } from '@/modules/nutrition/routes/index';
import { getLocalDateISOString } from '@/utils/dateUtils';

export default function MealRecipeRoute() {
  const { mealId, date } = useLocalSearchParams<{ mealId?: string; date?: string }>();
  return <MealRecipeScreen mealId={mealId ?? ''} date={date ?? getLocalDateISOString()} />;
}
