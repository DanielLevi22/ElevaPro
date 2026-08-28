import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusModal, type StatusModalType } from '@/components/ui/StatusModal';
import { colors as brandColors } from '@/constants/colors';
import { useHealthData } from '@/hooks/useHealthData';
import { MealCard } from '../components/MealCard';
import { useNutritionStore } from '../store/nutritionStore';
import FoodSearchScreen from './FoodSearchScreen';

const DAYS = [
  { id: 0, label: 'DOM' },
  { id: 1, label: 'SEG' },
  { id: 2, label: 'TER' },
  { id: 3, label: 'QUA' },
  { id: 4, label: 'QUI' },
  { id: 5, label: 'SEX' },
  { id: 6, label: 'SÁB' },
];

// Helper to get the date object for the selected day index in the CURRENT week
const getDateOfSelectedDay = (dayIndex: number) => {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = dayIndex - currentDay;

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate;
};

export function StudentNutritionScreen() {
  const { user, isMasquerading, accountType } = useAuthStore();
  const isMember = accountType === 'member';
  const {
    currentDietPlan,
    fetchDietPlan,
    meals,
    fetchMeals,
    mealItems,
    fetchMealItems,
    isLoading,
    dailyLogs,
    fetchDailyLogs,
    toggleMealCompletion,
    substituteFood,
  } = useNutritionStore();

  const { calories: _burnedCalories } = useHealthData();

  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [refreshing, setRefreshing] = useState(false);

  // Status Modal State
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: StatusModalType;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Substitution state
  const [substitutionData, setSubstitutionData] = useState<{
    visible: boolean;
    mealId: string;
    originalItemId: string;
    targetMacros: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  } | null>(null);

  // Helper to get the date object for the selected day index in the CURRENT week

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    // Only fetch plan if likely needed or stale, but here we just fetch to be safe
    if (!currentDietPlan) {
      await fetchDietPlan(user.id);
    }

    const targetDateObj = getDateOfSelectedDay(selectedDay);

    // Fix: Ensure we construct the ISO string correctly for the target date
    const offset = targetDateObj.getTimezoneOffset() * 60000;
    const localISOTime = new Date(targetDateObj.getTime() - offset).toISOString().slice(0, 10);

    await fetchDailyLogs(user.id, localISOTime);
  }, [user?.id, selectedDay, currentDietPlan, fetchDietPlan, fetchDailyLogs]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadData();
      }
    }, [user?.id, loadData]) // Reload when selectedDay changes
  );

  useEffect(() => {
    if (currentDietPlan) {
      fetchMeals(currentDietPlan.id);
    }
  }, [currentDietPlan, fetchMeals]);

  useEffect(() => {
    if (meals.length > 0) {
      meals.forEach((meal) => {
        fetchMealItems(meal.id);
      });
    }
  }, [meals, fetchMealItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleCheck = async (mealId: string) => {
    if (isMasquerading) {
      setStatusModal({
        visible: true,
        title: 'Modo Leitura',
        message: 'Você está visualizando como aluno. Não é possível alterar dados.',
        type: 'info',
      });
      return;
    }

    const targetDateObj = getDateOfSelectedDay(selectedDay);
    const _today = new Date();

    // Reset hours to compare only dates
    targetDateObj.setHours(0, 0, 0, 0);
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);

    if (targetDateObj > todayZero) {
      setStatusModal({
        visible: true,
        title: 'Ainda não!',
        message: 'Você não pode marcar refeições de dias futuros. Planeje no presente! ✨',
        type: 'warning',
      });
      return;
    }

    const offset = targetDateObj.getTimezoneOffset() * 60000;
    const targetDateString = new Date(targetDateObj.getTime() - offset).toISOString().slice(0, 10);

    const isCompleted = dailyLogs[mealId]?.completed || false;
    await toggleMealCompletion(mealId, targetDateString, !isCompleted);
  };

  const handleSubstitute = async (
    food: {
      id: string;
      name: string;
      calories: number | null;
      protein: number | null;
      carbs: number | null;
      fat: number | null;
      serving_size: number;
      serving_unit: string;
    },
    quantity?: number
  ) => {
    if (!substitutionData || !quantity) return;

    const targetDateObj = getDateOfSelectedDay(selectedDay);
    const offset = targetDateObj.getTimezoneOffset() * 60000;
    const targetDateString = new Date(targetDateObj.getTime() - offset).toISOString().slice(0, 10);

    try {
      await substituteFood(
        substitutionData.mealId,
        targetDateString,
        substitutionData.originalItemId,
        food as never,
        quantity,
        food.serving_unit
      );
      setSubstitutionData(null);
    } catch (error) {
      console.error('Error substituting food:', error);
      setStatusModal({
        visible: true,
        title: 'Erro',
        message: 'Não foi possível substituir o alimento.',
        type: 'error',
      });
    }
  };

  const dayMeals = meals
    .filter((m) => m.day_of_week === selectedDay)
    .sort((a, b) => (a.meal_order || 0) - (b.meal_order || 0));

  const dayTotalMacros = dayMeals.reduce(
    (total, meal) => {
      // Use substituted items if they exist in the logs for THIS day
      const log = dailyLogs[meal.id];
      const items =
        (log?.actual_items as unknown as Array<{
          quantity: number;
          food?: {
            serving_size?: number;
            calories?: number;
            protein?: number;
            carbs?: number;
            fat?: number;
          };
        }>) ||
        mealItems[meal.id] ||
        [];

      items.forEach(
        (item: {
          quantity: number;
          food?: {
            serving_size?: number;
            calories?: number;
            protein?: number;
            carbs?: number;
            fat?: number;
          };
        }) => {
          const food = item.food;
          if (food) {
            const multiplier = item.quantity / (food.serving_size || 100);
            total.calories += (food.calories || 0) * multiplier;
            total.protein += (food.protein || 0) * multiplier;
            total.carbs += (food.carbs || 0) * multiplier;
            total.fat += (food.fat || 0) * multiplier;
          }
        }
      );
      return total;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const consumedMacros = dayMeals.reduce(
    (total, meal) => {
      // Check validation against logs
      const log = dailyLogs[meal.id];
      if (log?.completed) {
        const items =
          (log.actual_items as unknown as Array<{
            quantity: number;
            food?: {
              serving_size?: number;
              calories?: number;
              protein?: number;
              carbs?: number;
              fat?: number;
            };
          }>) ||
          mealItems[meal.id] ||
          [];
        items.forEach(
          (item: {
            quantity: number;
            food?: {
              serving_size?: number;
              calories?: number;
              protein?: number;
              carbs?: number;
              fat?: number;
            };
          }) => {
            const food = item.food;
            if (food) {
              const multiplier = item.quantity / (food.serving_size || 100);
              total.calories += (food.calories || 0) * multiplier;
              total.protein += (food.protein || 0) * multiplier;
              total.carbs += (food.carbs || 0) * multiplier;
              total.fat += (food.fat || 0) * multiplier;
            }
          }
        );
      }
      return total;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const router = useRouter();

  if (isLoading && !refreshing && !currentDietPlan) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color={brandColors.primary.start} />
      </ScreenLayout>
    );
  }

  if (!currentDietPlan) {
    return (
      <ScreenLayout>
        <ScrollView
          contentContainerStyle={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandColors.primary.start}
            />
          }
        >
          <View
            className="p-8 rounded-full mb-6 border"
            style={{
              backgroundColor: brandColors.background.secondary,
              borderColor: brandColors.border.dark,
            }}
          >
            <Ionicons name="restaurant-outline" size={64} color={brandColors.text.disabled} />
          </View>
          <Text className="text-white text-xl font-bold mb-2 text-center font-display">
            Nenhum plano ativo
          </Text>
          <Text className="text-zinc-400 text-center text-sm mb-8 font-sans leading-relaxed">
            {isMember
              ? 'Crie seu primeiro plano alimentar personalizado.'
              : 'Você ainda não possui um plano alimentar ativo. Entre em contato com seu nutricionista.'}
          </Text>
          {isMember && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/nutrition/create')}
              className="rounded-2xl py-3 px-8 overflow-hidden"
              style={{ backgroundColor: brandColors.primary.start }}
            >
              <Text className="text-black font-bold text-base font-display">
                Criar Plano Alimentar
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View className="px-6 pt-8 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-3xl font-extrabold text-white font-display tracking-tight">
            Minha Dieta
          </Text>
          <Text className="text-zinc-400 font-sans font-medium mt-1">{currentDietPlan.name}</Text>
          {isMember && (
            <Text className="text-zinc-500 text-xs font-sans mt-0.5 uppercase tracking-widest">
              Planejamento & Execução
            </Text>
          )}
        </View>
        <View className="flex-row gap-3">
          {isMember && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/nutrition/[id]' as never,
                  params: { id: currentDietPlan.id, planId: currentDietPlan.id },
                })
              }
              className="p-3 rounded-full border shadow-sm"
              style={{
                backgroundColor: brandColors.background.secondary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Ionicons name="restaurant-outline" size={24} color={brandColors.primary.start} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/nutrition/shopping-list')}
            className="p-3 rounded-full border shadow-sm"
            style={{
              backgroundColor: brandColors.background.secondary,
              borderColor: brandColors.border.dark,
            }}
          >
            <Ionicons name="cart-outline" size={24} color={brandColors.text.primary} />
          </TouchableOpacity>

          {!isMasquerading && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/nutrition/scan')}
              className="p-3 rounded-full border shadow-sm"
              style={{
                backgroundColor: brandColors.background.secondary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Ionicons name="camera" size={24} color={brandColors.primary.start} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandColors.primary.start}
          />
        }
      >
        {/* Day Selector */}
        <View className="px-6 mb-8">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3">
              {DAYS.map((day) => {
                const isSelected = selectedDay === day.id;
                return (
                  <TouchableOpacity
                    key={day.id}
                    onPress={() => setSelectedDay(day.id)}
                    className="px-5 py-2.5 rounded-2xl border"
                    style={{
                      backgroundColor: isSelected
                        ? brandColors.primary.start
                        : brandColors.background.secondary,
                      borderColor: isSelected ? brandColors.primary.start : brandColors.border.dark,
                    }}
                  >
                    <Text
                      className="font-black text-[10px] tracking-widest uppercase"
                      style={{ color: isSelected ? 'white' : brandColors.text.muted }}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Macros Summary (Premium Bento Style) */}
        <View className="px-6 mb-8">
          <View
            className="rounded-3xl p-6 border shadow-2xl relative overflow-hidden"
            style={{
              backgroundColor: brandColors.background.secondary,
              borderColor: brandColors.border.dark,
            }}
          >
            {/* Background Accent */}
            <View
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10"
              style={{ backgroundColor: brandColors.primary.start }}
            />

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                Resumo do Dia
              </Text>
              <View className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10">
                <Text className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  Ativo
                </Text>
              </View>
            </View>

            {/* Calories Row */}
            <View className="flex-row justify-between mb-8">
              <View className="items-start">
                <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
                  Meta
                </Text>
                <Text className="text-white font-black text-3xl font-display">
                  {Math.round(dayTotalMacros.calories)}
                </Text>
              </View>
              <View className="items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center border-4"
                  style={{
                    borderColor: `${brandColors.primary.start}20`,
                  }}
                >
                  <Text className="text-white font-black text-xs font-display">
                    {Math.min(
                      Math.round((consumedMacros.calories / (dayTotalMacros.calories || 1)) * 100),
                      100
                    )}
                    %
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
                  Restam
                </Text>
                <Text
                  className="font-black text-3xl font-display"
                  style={{ color: brandColors.primary.start }}
                >
                  {Math.max(0, Math.round(dayTotalMacros.calories - consumedMacros.calories))}
                </Text>
              </View>
            </View>

            {/* Macros Row */}
            <View className="flex-row justify-between px-1">
              <View className="items-center bg-white/5 p-3 rounded-2xl flex-1 mr-3 border border-white/5">
                <Text className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-1">
                  Prot
                </Text>
                <Text className="text-white font-bold text-sm">
                  {Math.round(consumedMacros.protein)}g
                </Text>
              </View>
              <View className="items-center bg-white/5 p-3 rounded-2xl flex-1 mr-3 border border-white/5">
                <Text className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-1">
                  Carb
                </Text>
                <Text className="text-white font-bold text-sm">
                  {Math.round(consumedMacros.carbs)}g
                </Text>
              </View>
              <View className="items-center bg-white/5 p-3 rounded-2xl flex-1 border border-white/5">
                <Text className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-1">
                  Gord
                </Text>
                <Text className="text-white font-bold text-sm">
                  {Math.round(consumedMacros.fat)}g
                </Text>
              </View>
            </View>

            {/* Main Progress Bar */}
            <View className="h-2 bg-white/5 rounded-full overflow-hidden mt-6 border border-white/5">
              <LinearGradient
                colors={brandColors.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((consumedMacros.calories / (dayTotalMacros.calories || 1)) * 100, 100)}%`,
                }}
              />
            </View>
          </View>
        </View>

        {/* Meals List */}
        <View className="px-6">
          {dayMeals.length > 0 ? (
            dayMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={{
                  ...meal,
                  name: meal.name || 'Refeição',
                  meal_time: meal.meal_time ?? undefined,
                }}
                items={
                  (dailyLogs[meal.id]?.actual_items as unknown as Array<{
                    id: string;
                    quantity: number;
                    unit?: string;
                    is_substitution?: boolean;
                    food?: {
                      id: string;
                      name: string;
                      serving_size?: number;
                      calories?: number;
                      protein?: number;
                      carbs?: number;
                      fat?: number;
                    };
                  }>) ||
                  mealItems[meal.id] ||
                  []
                }
                onAddFood={() => {}}
                onRemoveFood={() => {}}
                onUpdateMealTime={() => {}}
                onUpdateFood={() => {}}
                isEditable={false}
                isChecked={dailyLogs[meal.id]?.completed}
                onToggleCheck={() => handleToggleCheck(meal.id)}
                onSubstituteFood={(itemId) => {
                  const targetItem = (
                    (dailyLogs[meal.id]?.actual_items as unknown as Array<{
                      id: string;
                      quantity: number;
                      unit?: string;
                      is_substitution?: boolean;
                      food?: {
                        id: string;
                        name: string;
                        serving_size?: number;
                        calories?: number;
                        protein?: number;
                        carbs?: number;
                        fat?: number;
                      };
                    }>) ||
                    mealItems[meal.id] ||
                    []
                  ).find(
                    (i: {
                      id: string;
                      food?: {
                        serving_size?: number;
                        calories?: number;
                        protein?: number;
                        carbs?: number;
                        fat?: number;
                      };
                    }) => i.id === itemId
                  );
                  if (targetItem?.food) {
                    const r = targetItem.quantity / (targetItem.food.serving_size || 100);
                    setSubstitutionData({
                      visible: true,
                      mealId: meal.id,
                      originalItemId: itemId,
                      targetMacros: {
                        calories: (targetItem.food.calories || 0) * r,
                        protein: (targetItem.food.protein || 0) * r,
                        carbs: (targetItem.food.carbs || 0) * r,
                        fat: (targetItem.food.fat || 0) * r,
                      },
                    });
                  }
                }}
                onCook={() => {
                  if (isMasquerading) {
                    setStatusModal({
                      visible: true,
                      title: 'Modo Leitura',
                      message: 'Você está visualizando como aluno.',
                      type: 'info',
                    });
                    return;
                  }
                  const items = mealItems[meal.id] || [];
                  if (items.length === 0) {
                    setStatusModal({
                      visible: true,
                      title: 'Vazio',
                      message: 'esta refeição não tem alimentos cadastrados.',
                      type: 'info',
                    });
                    return;
                  }
                  const ingredients = JSON.stringify(
                    items.map((i) => i.food?.name || 'Item sem nome')
                  );
                  router.push({
                    pathname: '/(tabs)/nutrition/cooking',
                    params: { mealName: meal.name, ingredients, mealId: meal.id },
                  });
                }}
              />
            ))
          ) : (
            <View className="items-center py-10">
              <Text className="text-zinc-500">Nenhuma refeição planejada para este dia.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* NutriBot FAB (Premium Glow) */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/nutrition/bot')}
        activeOpacity={0.9}
        className="absolute bottom-36 right-6 w-16 h-16 rounded-full items-center justify-center shadow-2xl z-50 overflow-hidden"
      >
        <LinearGradient
          colors={brandColors.gradients.primary}
          className="w-full h-full items-center justify-center"
        >
          <Ionicons name="chatbubbles" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Status Modal */}
      <StatusModal
        visible={statusModal.visible}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Food Substitution Search Modal */}
      {substitutionData?.visible && (
        <View className="absolute inset-0 z-[100]">
          <FoodSearchScreen
            onClose={() => setSubstitutionData(null)}
            onSelect={handleSubstitute}
            substitutionTarget={substitutionData.targetMacros}
          />
        </View>
      )}
    </ScreenLayout>
  );
}
