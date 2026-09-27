import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import type { PlanMeal } from '../../hooks/useDietPlanEditor';
import { numeroDoBanco } from '../../services/consumoDoDia';
import { mealCalories } from '../../services/dietPlanSummary';

/**
 * A refeição na montagem do kit (tela 18): a hora num quadrado, nome, horário e
 * kcal, o lápis, e os alimentos em linhas com marcador.
 *
 * @example <MealBuilderCard meal={refeicao} onEdit={() => abrir(refeicao.id)} />
 */
interface MealBuilderCardProps {
  meal: PlanMeal;
  onEdit?: () => void;
}

const PENCIL_SIZE = 15;

function hourBadge(time: string | null): string {
  return time ? `${time.slice(0, 2)}h` : '--';
}

function itemLabel(item: PlanMeal['diet_meal_items'][number]): string {
  return `${item.food?.name ?? 'Alimento'} · ${numeroDoBanco(item.quantity)} ${item.unit}`;
}

export function MealBuilderCard({ meal, onEdit }: MealBuilderCardProps) {
  const cores = useCores();
  const escalar = useEscala();
  const time = meal.meal_time?.slice(0, 5) ?? null;
  const kcal = Math.round(mealCalories(meal));

  return (
    <TouchableOpacity
      onPress={onEdit}
      disabled={!onEdit}
      activeOpacity={0.85}
      accessibilityRole={onEdit ? 'button' : undefined}
      accessibilityLabel={onEdit ? `Editar ${meal.name}` : undefined}
    >
      <Vidro classeExterna="mt-2.5" className="p-3.5">
        <View className="mb-2.5 flex-row items-center gap-3">
          <View className="h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-[0.6875rem] bg-glass-strong">
            <Text className="text-[0.65625rem] font-extrabold text-primary-text">
              {hourBadge(time)}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[0.84375rem] font-bold text-foreground">{meal.name}</Text>
            <Text className="text-[0.6875rem] text-muted-foreground">
              {time ? `${time} · ${kcal} kcal` : `${kcal} kcal`}
            </Text>
          </View>
          {onEdit && (
            <Ionicons name="pencil-outline" size={escalar(PENCIL_SIZE)} color={cores.placeholder} />
          )}
        </View>
        {meal.diet_meal_items.length === 0 ? (
          <Text className="border-t border-glass-border pt-2 text-[0.78125rem] text-placeholder">
            Nenhum alimento ainda
          </Text>
        ) : (
          meal.diet_meal_items.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center gap-3 border-t border-glass-border py-1.5"
            >
              <View className="h-[0.3125rem] w-[0.3125rem] rounded-full bg-placeholder" />
              <Text className="flex-1 text-[0.78125rem] text-muted-foreground">
                {itemLabel(item)}
              </Text>
            </View>
          ))
        )}
      </Vidro>
    </TouchableOpacity>
  );
}
