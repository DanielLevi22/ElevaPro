// Nutrition Module - Public API
// This module handles nutrition plans, meals, and dietary tracking

// Types (re-export from @elevapro/core)
export type { DietMeal, DietMealItem, DietPlan, Food } from '@elevapro/core';
// Components
export {
  DailyNutrition,
  DayOptionsModal,
  FoodSearchModal,
  MacroProgressBar,
  MealCard,
} from '../components';
export { DetalheDaRefeicaoScreen } from '../screens/aluno/DetalheDaRefeicaoScreen';
export { PlanoDoDiaScreen } from '../screens/aluno/PlanoDoDiaScreen';
// Screens
export { default as CreateDietScreen } from '../screens/CreateDietScreen';
export { default as DietDetailsScreen } from '../screens/DietDetailsScreen';
export { MemberNutritionScreen } from '../screens/MemberNutritionScreen';
export { default as NutritionScreen } from '../screens/NutritionScreen';
export { StudentNutritionScreen } from '../screens/StudentNutritionScreen';
// Store
export { useNutritionStore } from '../store/nutritionStore';

// Utils
export * from '../utils/nutrition';
// Routes
export { NutritionNavigator } from './routes';
