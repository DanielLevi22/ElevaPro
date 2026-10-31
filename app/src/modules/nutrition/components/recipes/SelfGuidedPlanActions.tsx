import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { ROUTES } from '@/navigation/types';
import { useNutritionStore } from '../../store/nutritionStore';

/** Preserva a criação e gestão do Praticante no plano diário. */
export function SelfGuidedPlanActions() {
  const router = useRouter();
  const abilities = useAuthStore((state) => state.abilities);
  const studentId = useAuthStore((state) => state.user?.id);
  const planId = useNutritionStore((state) => state.currentDietPlan?.id);
  return (
    <View className="mt-3 flex-row gap-3">
      {studentId && abilities?.can('create', 'Diet') ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: ROUTES.NUTRITION.WIZARD_START, params: { studentId } })
          }
          className="flex-1 rounded-xl bg-primary/15 p-3"
        >
          <Text className="text-center font-bold text-primary">Criar plano</Text>
        </TouchableOpacity>
      ) : null}
      {planId && abilities?.can('update', 'Diet') ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.push(ROUTES.NUTRITION.PLAN(planId))}
          className="flex-1 rounded-xl bg-primary/15 p-3"
        >
          <Text className="text-center font-bold text-primary">Gerenciar plano</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
