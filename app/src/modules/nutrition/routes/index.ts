// Nutrition Module - Public API
// This module handles nutrition plans, meals, and dietary tracking

// Types (re-export from @elevapro/core)
export type { DietMeal, DietMealItem, DietPlan, Food } from '@elevapro/core';
// Components
export { MealCard } from '../components';
export { AderenciaDaSemanaScreen } from '../screens/aluno/AderenciaDaSemanaScreen';
export { AssistenteDeNutricaoScreen } from '../screens/aluno/AssistenteDeNutricaoScreen';
export { BuscarAlimentoScreen } from '../screens/aluno/BuscarAlimentoScreen';
export { DetalheDaRefeicaoScreen } from '../screens/aluno/DetalheDaRefeicaoScreen';
export { EscanearPratoScreen } from '../screens/aluno/EscanearPratoScreen';
export { ListaDeComprasScreen } from '../screens/aluno/ListaDeComprasScreen';
export { PlanoDoDiaScreen } from '../screens/aluno/PlanoDoDiaScreen';
export { SubstituirAlimentoScreen } from '../screens/aluno/SubstituirAlimentoScreen';
// Criação de dieta em passos (#337)
export { default as DietAssistantScreen } from '../screens/diet/DietAssistantScreen';
export { default as DietFoodSearchScreen } from '../screens/diet/DietFoodSearchScreen';
export { default as DietGoalsScreen } from '../screens/diet/DietGoalsScreen';
export { default as DietMealScreen } from '../screens/diet/DietMealScreen';
export { default as DietPlanScreen } from '../screens/diet/DietPlanScreen';
export { default as DietPlanViewScreen } from '../screens/diet/DietPlanViewScreen';
export { default as DietReviewScreen } from '../screens/diet/DietReviewScreen';
export { default as DietSentScreen } from '../screens/diet/DietSentScreen';
export { default as DietStartScreen } from '../screens/diet/DietStartScreen';
// Screens
export { default as NutritionScreen } from '../screens/NutritionScreen';
// Store
export { useNutritionStore } from '../store/nutritionStore';

// Routes
export { NutritionNavigator } from './routes';
