import { Redirect } from 'expo-router';
import { ROUTES } from '@/navigation/types';

/** Links antigos seguem para o mesmo fluxo atual de Nutrição. */
export default function FollowNutritionRoute() {
  return <Redirect href={ROUTES.NUTRITION.ROOT} />;
}
