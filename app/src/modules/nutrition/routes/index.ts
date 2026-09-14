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
export { AderenciaDaSemanaScreen } from '../screens/aluno/AderenciaDaSemanaScreen';
export { BuscarAlimentoScreen } from '../screens/aluno/BuscarAlimentoScreen';
export { DetalheDaRefeicaoScreen } from '../screens/aluno/DetalheDaRefeicaoScreen';
export { ListaDeComprasScreen } from '../screens/aluno/ListaDeComprasScreen';
export { PlanoDoDiaScreen } from '../screens/aluno/PlanoDoDiaScreen';
export { SubstituirAlimentoScreen } from '../screens/aluno/SubstituirAlimentoScreen';
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
