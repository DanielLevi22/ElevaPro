import {
  createNutritionService,
  type DietMeal,
  type DietMealItem,
  type DietPlan,
  type Food,
  mealsOfDay,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { numeroDoBanco } from '../services/consumoDoDia';

const nutrition = createNutritionService(supabase);

export type PlanMeal = DietMeal & { diet_meal_items: (DietMealItem & { food: Food })[] };

export interface MealDraft {
  name: string;
  meal_time: string | null;
  prep_minutes: number | null;
  servings: number | null;
  difficulty?: DietMeal['difficulty'];
}

export interface DietPlanEditor {
  plan: DietPlan | null;
  meals: PlanMeal[];
  loading: boolean;
  error: boolean;
  canEdit: boolean;
  /** Dia aberto, domingo = 0. Só muda algo na dieta cíclica. */
  day: number;
  setDay: (day: number) => void;
  mealsOfTheDay: PlanMeal[];
  hasCopiedDay: boolean;
  reload: () => Promise<void>;
  saveMeal: (draft: MealDraft, mealId?: string) => Promise<string | null>;
  deleteMeal: (mealId: string) => Promise<boolean>;
  addFoods: (mealId: string, foods: Food[]) => Promise<boolean>;
  setItemQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  copyDay: () => void;
  pasteDay: () => Promise<boolean>;
  clearDay: () => Promise<boolean>;
  /** Grava a mensagem e envia: o rascunho passa a valer (#337). */
  send: (notes: string | null) => Promise<boolean>;
}

// Segunda: é o primeiro dia da faixa, e o dia em que a semana de treino começa.
const MONDAY = 1;

function failed(action: string) {
  showAlert({ title: 'Não foi possível salvar', message: `Falha ao ${action}.`, type: 'error' });
}

/**
 * O plano aberto no passo 3 da criação de dieta (#337): refeições, itens e as
 * edições, gravadas na hora como no editor do web. Cada edição recarrega o
 * plano, para a tela nunca mostrar o que o banco recusou.
 *
 * `initialDay` abre o plano cíclico no dia de quem chamou — a tela da refeição
 * recebe o dia da tela do plano, e é nele que a refeição nova nasce.
 *
 * @example
 * const editor = useDietPlanEditor(planId);
 * await editor.addFoods(mealId, selecionados);
 */
export function useDietPlanEditor(planId: string, initialDay = MONDAY): DietPlanEditor {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [meals, setMeals] = useState<PlanMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);
  const canUpdate = useAuthStore((s) => !!s.abilities?.can('update', 'Diet'));
  const [day, setDay] = useState(initialDay);
  const [copied, setCopied] = useState<PlanMeal[] | null>(null);

  const reload = useCallback(async () => {
    try {
      const [loadedPlan, loadedMeals] = await Promise.all([
        nutrition.fetchDietPlanById(planId),
        nutrition.fetchDietMeals(planId),
      ]);
      setPlan(loadedPlan);
      setMeals(loadedMeals as PlanMeal[]);
      setError(false);
    } catch {
      setError(true);
      showAlert({ title: 'Erro', message: 'Não foi possível abrir o plano.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const mealsOfTheDay = mealsOfDay(meals, plan?.plan_type, day);
  const dayOfNewMeal = plan?.plan_type === 'cyclic' ? day : null;
  const canEdit =
    !!plan &&
    plan.id === planId &&
    plan.status === 'draft' &&
    canUpdate &&
    (plan.specialist_id === userId || (plan.specialist_id === null && plan.student_id === userId));

  async function run(action: string, work: () => Promise<unknown>) {
    if (!canEdit) return false;
    try {
      await work();
      await reload();
      return true;
    } catch {
      failed(action);
      return false;
    }
  }

  async function saveMeal(draft: MealDraft, mealId?: string): Promise<string | null> {
    if (!canEdit) return null;
    try {
      const saved = mealId
        ? await nutrition.updateDietMeal(mealId, draft)
        : await nutrition.createDietMeal({
            ...draft,
            diet_plan_id: planId,
            day_of_week: dayOfNewMeal,
            meal_order: mealsOfTheDay.length,
          });
      await reload();
      return saved.id;
    } catch {
      failed('salvar a refeição');
      return null;
    }
  }

  const addFoods = (mealId: string, foods: Food[]) => {
    const current = meals.find((meal) => meal.id === mealId)?.diet_meal_items.length ?? 0;
    return run('adicionar os alimentos', () =>
      nutrition.addFoodsToMeal(
        foods.map((food, index) => ({
          diet_meal_id: mealId,
          food_id: food.id,
          quantity: numeroDoBanco(food.serving_size) || 100,
          unit: food.serving_unit,
          order_index: current + index,
        }))
      )
    );
  };

  async function send(notes: string | null): Promise<boolean> {
    if (!canEdit) return false;
    try {
      await nutrition.updateDietPlan(planId, { notes });
      await nutrition.activateDietPlan(planId);
      return true;
    } catch {
      failed('enviar o plano');
      return false;
    }
  }

  return {
    plan,
    meals,
    loading,
    error,
    canEdit,
    day,
    setDay,
    mealsOfTheDay,
    hasCopiedDay: copied !== null,
    reload,
    saveMeal,
    deleteMeal: (mealId) => run('apagar a refeição', () => nutrition.deleteDietMeal(mealId)),
    addFoods,
    setItemQuantity: (itemId, quantity) =>
      run('mudar a quantidade', () => nutrition.updateMealItem(itemId, { quantity })),
    removeItem: (itemId) => run('tirar o alimento', () => nutrition.removeFoodFromMeal(itemId)),
    copyDay: () => setCopied(mealsOfTheDay),
    pasteDay: () => run('colar o dia', () => nutrition.pasteDietDay(planId, day, copied ?? [])),
    clearDay: () => run('limpar o dia', () => nutrition.clearDietDay(planId, day)),
    send,
  };
}
