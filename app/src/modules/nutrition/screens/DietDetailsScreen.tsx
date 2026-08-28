import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useAuthStore } from '@/auth';
import AddFoodQuantityModal from '@/components/AddFoodQuantityModal';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusModal } from '@/components/ui/StatusModal';
import { colors as brandColors } from '@/constants/colors';
import { useDietMeals, useDietPlan } from '@/hooks/useNutrition';
import { FoodSearchModal } from '../components';
import { DayActionsModal } from '../components/DayActionsModal';
import { type FoodItem } from '../screens/FoodSearchScreen';
import { useNutritionStore } from '../store/nutritionStore';

export default function DietDetailsScreen() {
  const { planId } = useLocalSearchParams();
  const router = useRouter();
  const { isMasquerading, accountType } = useAuthStore();
  const canManage = accountType === 'specialist' || accountType === 'member';
  const {
    addMeal,
    updateMeal,
    addFoodToMeal,
    addFoodsToMeal,
    updateMealItem,
    removeFoodFromMeal,
    copyDay,
    pasteDay,
    clearDay,
    copiedDay,
  } = useNutritionStore();

  const planIdStr = Array.isArray(planId) ? planId[0] : planId;

  const { data: plan, isLoading: isPlanLoading } = useDietPlan(planIdStr);
  const {
    data: mealsData,
    isLoading: isMealsLoading,
    refetch: refetchMeals,
  } = useDietMeals(planIdStr);
  const meals = mealsData?.meals ?? [];
  const mealItems = mealsData?.mealItems ?? {};
  const isLoading = isPlanLoading || isMealsLoading;

  const [selectedDay, setSelectedDay] = useState(0); // 0 = Sunday, etc.

  // UI States
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showDayActions, setShowDayActions] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<{ id: string; serving_unit: string } | null>(
    null
  );
  const [selectedItemToEdit, setSelectedItemToEdit] = useState<{
    id: string;
    quantity?: number;
  } | null>(null);
  const [initialMealData, setInitialMealData] = useState<{
    name: string;
    time: string;
    type: string;
    order: number;
  } | null>(null);

  const [showMealModal, setShowMealModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealName, setMealName] = useState('');
  const [mealTime, setMealTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<ScrollView>();
  const HEADER_MAX_HEIGHT = 420;
  const HEADER_MIN_HEIGHT = 120;

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const toggleHeader = () => {
    runOnUI(() => {
      'worklet';
      if (scrollY.value > (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) / 2) {
        // Expand
        scrollTo(scrollRef, 0, 0, true);
      } else {
        // Collapse
        scrollTo(scrollRef, 0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT, true);
      }
    })();
  };

  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
      [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      Extrapolation.CLAMP
    );
    return { height };
  });

  const arrowStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      scrollY.value,
      [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
      [180, 0],
      Extrapolation.CLAMP
    );
    return { transform: [{ rotate: `${rotate}deg` }] };
  });

  const contentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100], // Fade out faster (by 100px scroll)
      [1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(scrollY.value, [0, 100], [0, -20], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }],
      // Hide completely when faded out to avoid touch events
      display: opacity === 0 ? 'none' : 'flex',
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const scrollRange = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
    const opacity = interpolate(
      scrollY.value,
      [scrollRange * 0.5, scrollRange * 0.8], // Start fading in at 50%, fully visible at 80%
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      zIndex: 10,
    };
  });

  const handleSaveMeal = async () => {
    if (!mealName.trim() || !plan) return;

    if (!mealTime.trim()) {
      Alert.alert('Erro', 'Por favor, informe o horário da refeição.');
      return;
    }

    try {
      if (editingMealId) {
        // Update existing meal
        await updateMeal(editingMealId, {
          name: mealName,
          meal_time: mealTime || '00:00',
        });
      } else {
        // Create new meal
        await addMeal({
          diet_plan_id: plan.id,
          day_of_week: selectedDay,
          name: mealName,
          meal_time: mealTime || '00:00',
          meal_type: 'snack', // Default type
          meal_order: meals.filter((m) => m.day_of_week === selectedDay).length,
          target_calories: 0,
        } as never);
      }
      setShowMealModal(false);
      setMealName('');
      setMealTime('');
      setEditingMealId(null);
    } catch (error) {
      const err = error as { code?: string; details?: string; message?: string };
      if (err?.code === '23503' && err?.details?.includes('daily_goals')) {
        Alert.alert(
          'Erro de Cadastro',
          'O aluno não possui um perfil completo. Por favor, peça ao administrador para verificar o cadastro do aluno ou execute o script de correção de perfis.'
        );
      } else {
        Alert.alert('Erro', err.message || 'Falha ao salvar a refeição.');
      }
    }
  };

  const handleEditMealPress = (meal: { id: string; name: string; meal_time?: string }) => {
    setEditingMealId(meal.id);
    setMealName(meal.name);
    setMealTime(meal.meal_time || '');
    setShowMealModal(true);
  };

  const handleAddMealPress = () => {
    setEditingMealId(null);
    setMealName('');
    setMealTime('');
    setShowMealModal(true);
  };

  // --- Day Management ---

  const handleGenerateStandardMeals = async () => {
    if (!plan) return;

    const standardMeals = [
      { name: 'Café da Manhã', time: '08:00', type: 'breakfast' },
      { name: 'Almoço', time: '12:00', type: 'lunch' },
      { name: 'Lanche da Tarde', time: '16:00', type: 'snack' },
      { name: 'Jantar', time: '20:00', type: 'dinner' },
    ];

    try {
      for (let i = 0; i < standardMeals.length; i++) {
        const meal = standardMeals[i];
        await addMeal({
          diet_plan_id: plan.id,
          day_of_week: selectedDay,
          name: meal.name,
          meal_time: meal.time,
          meal_type: meal.type,
          meal_order: i,
          target_calories: 0,
        } as never);
      }
      refetchMeals();
    } catch (_error) {
      setStatusModal({
        visible: true,
        title: 'Erro',
        message: 'Falha ao gerar refeições.',
        type: 'error',
      });
    }
  };

  const handleCopyDay = async () => {
    await copyDay(selectedDay, meals, mealItems);
    setStatusModal({
      visible: true,
      title: 'Sucesso',
      message: 'Dia copiado com sucesso!',
      type: 'success',
    });
  };

  const handlePasteDay = async () => {
    if (!plan) return;
    Alert.alert('Colar Dia', 'Isso substituirá todas as refeições deste dia. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Colar',
        style: 'destructive',
        onPress: async () => {
          try {
            await pasteDay(selectedDay, plan.id);
            refetchMeals();
          } catch (error) {
            const err = error as { code?: string; details?: string; message?: string };
            if (
              err?.code === '23503' &&
              (err?.details?.includes('daily_goals') ||
                err?.details?.includes('leaderboard') ||
                err?.details?.includes('streak') ||
                err?.details?.includes('achievement'))
            ) {
              Alert.alert(
                'Erro de Cadastro',
                'O aluno não possui um perfil completo. Por favor, peça ao administrador para verificar o cadastro do aluno ou execute o script de correção de perfis.'
              );
            } else {
              Alert.alert('Erro', `Falha ao colar dia: ${err.message || JSON.stringify(err)}`);
            }
          }
        },
      },
    ]);
  };

  const handleClearDay = () => {
    if (!plan) return;
    Alert.alert('Limpar Dia', 'Tem certeza que deseja remover todas as refeições deste dia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearDay(selectedDay, plan.id);
            refetchMeals();
          } catch (_error) {
            Alert.alert('Erro', 'Falha ao limpar dia.');
          }
        },
      },
    ]);
  };

  // --- Food Management ---

  const handleAddFoodPress = (mealId: string) => {
    setSelectedMealId(mealId);
    setSelectedItemToEdit(null);
    setShowFoodSearch(true);
  };

  const handleEditItemPress = (
    item: { id: string; quantity: number; food: { id: string; serving_unit: string } },
    mealId: string
  ) => {
    setSelectedMealId(mealId);
    setSelectedItemToEdit(item);
    setSelectedFood(item.food);
    setShowQuantityModal(true);
  };

  const handleFoodSelect = (food: FoodItem, quantity?: number) => {
    if (quantity) {
      // Direct add from reverse calculator
      if (selectedMealId) {
        addFoodToMeal(selectedMealId, food.id, quantity, food.serving_unit)
          .then(() => refetchMeals())
          .catch(() => Alert.alert('Erro', 'Falha ao adicionar alimento'));
      }
      setShowFoodSearch(false);
    } else {
      // Open quantity modal
      setSelectedFood(food);
      setShowFoodSearch(false);
      setShowQuantityModal(true);
    }
  };

  const handleQuantityConfirm = async (quantity: number) => {
    if (!selectedMealId || !selectedFood) return;

    try {
      if (selectedItemToEdit) {
        // Update existing item
        await updateMealItem(selectedItemToEdit.id, {
          quantity,
        });
      } else {
        // Add new item
        await addFoodToMeal(selectedMealId, selectedFood.id, quantity, selectedFood.serving_unit);
      }
      setShowQuantityModal(false);
      setSelectedFood(null);
      setSelectedItemToEdit(null);
      refetchMeals();
    } catch (_error) {
      Alert.alert('Erro', 'Não foi possível salvar o alimento.');
    }
  };

  const handleRemoveItem = (itemId: string, _mealId: string) => {
    Alert.alert('Remover Alimento', 'Tem certeza que deseja remover este alimento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFoodFromMeal(itemId);
            refetchMeals();
          } catch (_error) {
            Alert.alert('Erro', 'Não foi possível remover o alimento.');
          }
        },
      },
    ]);
  };

  const _handleUpdateMealTime = async (mealId: string, time: string) => {
    try {
      await updateMeal(mealId, { meal_time: time });
    } catch (_error) {
      Alert.alert('Erro', 'Falha ao atualizar horário');
    }
  };

  if (isLoading || !plan) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color={brandColors.primary.start} />
      </ScreenLayout>
    );
  }

  const currentDayMeals = meals.filter((m) => m.day_of_week === selectedDay);

  // Calculate daily totals
  const dailyTotals = currentDayMeals.reduce(
    (acc, meal) => {
      const items = mealItems[meal.id] || [];
      items.forEach((item) => {
        const ratio = item.quantity / (item.food?.serving_size || 100);
        acc.calories += (item.food?.calories || 0) * ratio;
        acc.protein += (item.food?.protein || 0) * ratio;
        acc.carbs += (item.food?.carbs || 0) * ratio;
        acc.fat += (item.food?.fat || 0) * ratio;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const days = [
    { id: 0, label: 'DOM' },
    { id: 1, label: 'SEG' },
    { id: 2, label: 'TER' },
    { id: 3, label: 'QUA' },
    { id: 4, label: 'QUI' },
    { id: 5, label: 'SEX' },
    { id: 6, label: 'SÁB' },
  ];

  return (
    <ScreenLayout>
      <Animated.View
        style={[headerStyle]}
        className="absolute top-0 left-0 right-0 bg-background-secondary rounded-b-[32px] border-b border-zinc-800 z-10 overflow-hidden"
      >
        <View className="pt-12 px-6">
          {/* Collapsed Title - Positioned absolutely relative to the container */}
          <Animated.View
            style={[titleStyle]}
            className="absolute top-12 left-0 right-0 h-11 justify-center items-center z-10"
            pointerEvents="none"
          >
            <Text className="text-white font-bold text-lg" numberOfLines={1}>
              {plan?.name}
            </Text>
          </Animated.View>

          {/* Navigation Row */}
          <View className="flex-row items-center justify-between w-full mb-2 z-20 h-11">
            <IconButton
              accessibilityLabel="Voltar"
              icon="arrow-back"
              onPress={() => router.back()}
            />

            <View className="flex-row gap-2">
              <IconButton
                accessibilityLabel="Editar"
                icon="pencil"
                onPress={() =>
                  setStatusModal({
                    visible: true,
                    title: 'Em breve',
                    message: 'Edição em desenvolvimento',
                    type: 'info',
                  })
                }
                size={20}
              />
            </View>
          </View>

          {/* Expanded Content */}
          <Animated.View style={[contentStyle]} className="items-center w-full">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4 border-2"
              style={{
                backgroundColor: `${brandColors.primary.start}10`,
                borderColor: `${brandColors.primary.start}20`,
              }}
            >
              <Ionicons name="restaurant" size={40} color={brandColors.primary.start} />
            </View>

            <Text className="text-2xl font-black text-white mb-1 font-display text-center italic">
              {plan.name}
            </Text>
            <Text className="text-zinc-500 font-sans mb-6 text-center text-xs uppercase tracking-widest font-bold">
              Plano Alimentar
            </Text>

            {/* Macros Grid (Bento Style) */}
            <View className="flex-row gap-3 w-full">
              <View
                className="flex-1 p-4 rounded-3xl border items-center"
                style={{
                  backgroundColor: brandColors.background.primary,
                  borderColor: brandColors.border.dark,
                }}
              >
                <Text className="text-emerald-500 text-[9px] font-black uppercase tracking-widest mb-1">
                  PROTEÍNA
                </Text>
                <Text className="text-white text-xl font-black font-display tracking-tight">
                  {plan.target_protein}g
                </Text>
              </View>
              <View
                className="flex-1 p-4 rounded-3xl border items-center"
                style={{
                  backgroundColor: brandColors.background.primary,
                  borderColor: brandColors.border.dark,
                }}
              >
                <Text className="text-blue-500 text-[9px] font-black uppercase tracking-widest mb-1">
                  CARBO
                </Text>
                <Text className="text-white text-xl font-black font-display tracking-tight">
                  {plan.target_carbs}g
                </Text>
              </View>
              <View
                className="flex-1 p-4 rounded-3xl border items-center"
                style={{
                  backgroundColor: brandColors.background.primary,
                  borderColor: brandColors.border.dark,
                }}
              >
                <Text className="text-orange-500 text-[9px] font-black uppercase tracking-widest mb-1">
                  GORDURA
                </Text>
                <Text className="text-white text-xl font-black font-display tracking-tight">
                  {plan.target_fat}g
                </Text>
              </View>
            </View>

            <View
              className="mt-5 px-6 py-3 rounded-2xl border flex-row items-center mb-6 shadow-sm"
              style={{
                backgroundColor: brandColors.background.primary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Ionicons
                name="flame"
                size={20}
                color={brandColors.primary.start}
                style={{ marginRight: 10 }}
              />
              <Text className="text-white font-black text-xl font-display italic">
                {plan.target_calories}{' '}
                <Text className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">
                  kcal/dia
                </Text>
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Expand/Collapse Indicator */}
        <TouchableOpacity
          onPress={toggleHeader}
          className="absolute bottom-1 left-0 right-0 items-center justify-center py-2 z-50"
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 50, right: 50 }}
        >
          <Animated.View
            style={[
              arrowStyle,
              {
                backgroundColor: `${brandColors.background.elevated}80`,
                borderColor: brandColors.border.dark,
              },
            ]}
            className="rounded-full p-1.5 border"
          >
            <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef as never}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT + 20, paddingBottom: 100 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Day Selector */}
        <View className="px-6 mt-8 mb-4">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-zinc-500 font-black text-[10px] tracking-widest uppercase">
              DIA DA SEMANA
            </Text>
            {!isMasquerading && (
              <TouchableOpacity
                onPress={() => setShowDayActions(true)}
                className="flex-row items-center gap-2 px-4 py-2 rounded-2xl border"
                style={{
                  backgroundColor: brandColors.background.secondary,
                  borderColor: brandColors.border.dark,
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={brandColors.text.primary} />
                <Text className="text-white text-xs font-black uppercase tracking-widest">
                  Opções
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3">
              {days.map((day) => {
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

        {/* Meals List */}
        <View className="p-6">
          <Text className="text-white text-lg font-bold mb-4 font-display tracking-wide">
            REFEIÇÕES
          </Text>

          <View className="gap-4">
            {/* Standard Meals List */}
            {(() => {
              const STANDARD_MEALS = [
                { name: 'Café da Manhã', defaultTime: '08:00', type: 'breakfast' },
                { name: 'Lanche da Manhã', defaultTime: '10:00', type: 'snack' },
                { name: 'Almoço', defaultTime: '12:00', type: 'lunch' },
                { name: 'Lanche da Tarde', defaultTime: '16:00', type: 'snack' },
                { name: 'Jantar', defaultTime: '20:00', type: 'dinner' },
                { name: 'Ceia', defaultTime: '22:00', type: 'snack' },
              ];

              return STANDARD_MEALS.map((stdMeal, index) => {
                // Find existing meal that matches the name (fuzzy match or exact)
                // We use exact name match here as we are standardizing it
                const existingMeal = currentDayMeals.find((m) => m.name === stdMeal.name);

                if (existingMeal) {
                  const items = mealItems[existingMeal.id] || [];

                  const totalCals = items.reduce((acc, item) => {
                    const ratio = item.quantity / (item.food?.serving_size || 100);
                    return acc + (item.food?.calories || 0) * ratio;
                  }, 0);

                  // Calculate other macros for the meal card
                  const totalProtein = items.reduce((acc, item) => {
                    const ratio = item.quantity / (item.food?.serving_size || 100);
                    return acc + (item.food?.protein || 0) * ratio;
                  }, 0);
                  const totalCarbs = items.reduce((acc, item) => {
                    const ratio = item.quantity / (item.food?.serving_size || 100);
                    return acc + (item.food?.carbs || 0) * ratio;
                  }, 0);
                  const totalFat = items.reduce((acc, item) => {
                    const ratio = item.quantity / (item.food?.serving_size || 100);
                    return acc + (item.food?.fat || 0) * ratio;
                  }, 0);

                  return (
                    <View
                      key={existingMeal.id}
                      className="rounded-3xl p-5 border mb-1"
                      style={{
                        backgroundColor: brandColors.background.secondary,
                        borderColor: brandColors.border.dark,
                      }}
                    >
                      <View className="flex-row justify-between items-center mb-3">
                        <TouchableOpacity
                          className="flex-row items-center flex-1"
                          onPress={() =>
                            !isMasquerading && handleEditMealPress(existingMeal as never)
                          }
                          activeOpacity={isMasquerading ? 1 : 0.7}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={brandColors.primary.start}
                            style={{ marginRight: 8 }}
                          />
                          <Text className="text-white font-black text-base mr-2 font-display italic">
                            {existingMeal.name}
                          </Text>
                        </TouchableOpacity>
                        <View className="flex-row items-center gap-2">
                          <Text
                            className="font-black text-sm font-display tracking-tight"
                            style={{ color: brandColors.primary.start }}
                          >
                            {Math.round(totalCals)} kcal
                          </Text>
                        </View>
                      </View>

                      {/* Meal Macros Summary */}
                      {items.length > 0 && (
                        <View className="flex-row gap-4 mb-3 pl-6">
                          <Text className="text-zinc-500 text-xs">
                            P: <Text className="text-zinc-300">{Math.round(totalProtein)}g</Text>
                          </Text>
                          <Text className="text-zinc-500 text-xs">
                            C: <Text className="text-zinc-300">{Math.round(totalCarbs)}g</Text>
                          </Text>
                          <Text className="text-zinc-500 text-xs">
                            G: <Text className="text-zinc-300">{Math.round(totalFat)}g</Text>
                          </Text>
                        </View>
                      )}

                      {items.length > 0 ? (
                        <View className="gap-2 pl-2 border-l-2 border-zinc-800 ml-2">
                          {items.map((item, _idx) => {
                            return (
                              <TouchableOpacity
                                key={item.id}
                                className="flex-row justify-between items-center py-1"
                                onPress={() =>
                                  !isMasquerading &&
                                  handleEditItemPress(item as never, existingMeal.id)
                                }
                                onLongPress={() =>
                                  !isMasquerading && handleRemoveItem(item.id, existingMeal.id)
                                }
                                activeOpacity={isMasquerading ? 1 : 0.7}
                              >
                                <Text className="text-zinc-400 text-sm flex-1 mr-2">
                                  {item.food?.name}
                                </Text>
                                <Text className="text-zinc-500 text-sm">
                                  {item.quantity}
                                  {item.unit}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <Text className="text-zinc-600 text-xs italic ml-6">Sem alimentos</Text>
                      )}

                      {!isMasquerading && canManage && (
                        <View className="flex-row gap-2 mt-5">
                          <TouchableOpacity
                            onPress={() => handleAddFoodPress(existingMeal.id)}
                            className="flex-1 py-3 rounded-2xl border flex-row justify-center items-center shadow-sm"
                            style={{
                              backgroundColor: brandColors.background.primary,
                              borderColor: brandColors.border.dark,
                            }}
                          >
                            <Ionicons
                              name="add"
                              size={16}
                              color={brandColors.primary.start}
                              style={{ marginRight: 8 }}
                            />
                            <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                              Adicionar Alimento
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                } else {
                  // Render "Add [Meal Name]" button
                  if (isMasquerading || !canManage) return null;

                  return (
                    <TouchableOpacity
                      key={stdMeal.name}
                      onPress={() => {
                        // Open Draft Mode
                        setInitialMealData({
                          name: stdMeal.name,
                          time: stdMeal.defaultTime,
                          type: stdMeal.type,
                          order: index,
                        });
                        setMealTime(stdMeal.defaultTime); // Pre-fill time
                        setShowFoodSearch(true);
                      }}
                      className="p-5 rounded-3xl border border-dashed flex-row items-center justify-center mb-2"
                      style={{
                        backgroundColor: `${brandColors.background.secondary}50`,
                        borderColor: brandColors.border.dark,
                      }}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={24}
                        color={brandColors.primary.start}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        className="font-black text-sm uppercase tracking-widest"
                        style={{ color: brandColors.primary.start }}
                      >
                        Adicionar {stdMeal.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              });
            })()}
          </View>

          {!isMasquerading && canManage && (
            <TouchableOpacity
              className="mt-6 border-2 border-dashed rounded-3xl p-6 items-center justify-center"
              style={{ borderColor: brandColors.border.dark }}
              onPress={handleAddMealPress}
            >
              <Ionicons name="add-circle-outline" size={32} color={brandColors.text.disabled} />
              <Text className="text-zinc-500 font-black text-[10px] uppercase tracking-widest mt-3">
                Adicionar Nova Refeição
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.ScrollView>

      {/* Modals */}
      {(selectedMealId || initialMealData) && (
        <FoodSearchModal
          visible={showFoodSearch}
          onClose={() => {
            setShowFoodSearch(false);
            setSelectedMealId(null);
            setInitialMealData(null);
          }}
          onSelect={handleFoodSelect}
          mealId={selectedMealId || undefined}
          initialData={initialMealData || undefined}
          dailyTotals={dailyTotals}
          mealTime={mealTime}
          onTimeChange={setMealTime}
          onSave={async (items) => {
            try {
              if (selectedMealId) {
                // Editing existing meal
                const currentItems = mealItems[selectedMealId] || [];
                const currentIds = new Set(currentItems.map((i) => i.id));
                const resultIds = new Set(items.map((i) => i.id));

                // 1. Add New Items (those with temp IDs or not in current)
                const itemsToAdd = items
                  .filter((i) => !currentIds.has(i.id))
                  .map((item) => ({
                    foodId: item.food_id || item.food?.id,
                    quantity: item.quantity,
                    unit: item.unit,
                  }));

                if (itemsToAdd.length > 0) {
                  await addFoodsToMeal(selectedMealId, itemsToAdd);
                }

                // 2. Remove Deleted Items
                const itemsToRemove = currentItems.filter((i) => !resultIds.has(i.id));

                // Process removals sequentially to avoid race conditions/heavy load if many
                for (const item of itemsToRemove) {
                  await removeFoodFromMeal(item.id);
                }

                // 3. Refresh if changes made
                if (itemsToAdd.length > 0 || itemsToRemove.length > 0) {
                  await refetchMeals();
                }
              } else if (initialMealData) {
                // Creating NEW meal
                const newMeal = await addMeal({
                  diet_plan_id: plan.id,
                  day_of_week: selectedDay,
                  name: initialMealData.name,
                  meal_time: initialMealData.time,
                  meal_type: initialMealData.type,
                  meal_order: initialMealData.order,
                } as never);

                // Add items

                // Add items in batch
                const itemsToAdd = items.map((item) => ({
                  foodId: item.food_id,
                  quantity: item.quantity,
                  unit: item.unit,
                }));

                await addFoodsToMeal(newMeal.id, itemsToAdd);

                await refetchMeals();
              }
            } catch (error: unknown) {
              const err = error as Error & { code?: string; details?: string };
              if (err.code === '23503' && err.details?.includes('daily_goals')) {
                Alert.alert(
                  'Erro de Cadastro',
                  'O aluno não possui um perfil completo. Por favor, peça ao administrador para verificar o cadastro do aluno ou execute o script de correção de perfis.'
                );
              } else {
                Alert.alert(
                  'Erro',
                  `Falha ao salvar refeição: ${err.message || JSON.stringify(err)}`
                );
              }
              throw error; // Re-throw to keep modal open or handle in child
            }
          }}
        />
      )}

      <AddFoodQuantityModal
        visible={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        onConfirm={handleQuantityConfirm}
        food={selectedFood as never}
        initialQuantity={selectedItemToEdit?.quantity}
      />

      <DayActionsModal
        visible={showDayActions}
        onClose={() => setShowDayActions(false)}
        onCopy={handleCopyDay}
        onPaste={handlePasteDay}
        onClear={handleClearDay}
        onGenerate={handleGenerateStandardMeals}
        hasCopiedDay={!!copiedDay}
        dayName={days.find((d) => d.id === selectedDay)?.label || ''}
      />

      <Modal visible={showMealModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-background-secondary w-full max-w-sm rounded-3xl p-6 border border-zinc-800">
            <Text className="text-xl font-bold text-white font-display mb-4">
              {editingMealId ? 'Editar Refeição' : 'Nova Refeição'}
            </Text>

            <Text className="text-zinc-400 text-sm font-bold mb-2 ml-1">Sugestões</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 max-h-10">
              {[
                { name: 'Café da Manhã', time: '08:00' },
                { name: 'Lanche da Manhã', time: '10:00' },
                { name: 'Almoço', time: '12:00' },
                { name: 'Lanche da Tarde', time: '16:00' },
                { name: 'Jantar', time: '20:00' },
                { name: 'Ceia', time: '22:00' },
                { name: 'Pré-Treino', time: '18:00' },
                { name: 'Pós-Treino', time: '19:30' },
              ].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.name}
                  onPress={() => {
                    setMealName(suggestion.name);
                    setMealTime(suggestion.time);
                  }}
                  className="bg-background-primary px-3 py-2 rounded-lg mr-2 border border-zinc-700"
                >
                  <Text className="text-zinc-300 text-xs font-bold">{suggestion.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-zinc-400 text-sm font-bold mb-2 ml-1">Nome</Text>
            <TextInput
              className="bg-background-primary text-white p-4 rounded-xl border border-zinc-800 mb-4"
              placeholder="Ex: Lanche da Manhã"
              placeholderTextColor="#52525B"
              value={mealName}
              onChangeText={setMealName}
            />

            <Text className="text-zinc-400 text-sm font-bold mb-2 ml-1">Horário</Text>
            <TouchableOpacity
              className="bg-background-primary p-4 rounded-xl border border-zinc-800 mb-6 flex-row items-center justify-between"
              onPress={() => setShowTimePicker(true)}
            >
              <Text className="text-white text-base">{mealTime || '00:00'}</Text>
              <Ionicons name="time-outline" size={20} color="#52525B" />
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = (mealTime || '00:00').split(':').map(Number);
                  const date = new Date();
                  date.setHours(hours || 0);
                  date.setMinutes(minutes || 0);
                  return date;
                })()}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowTimePicker(false);
                  }
                  if (selectedDate) {
                    const hours = selectedDate.getHours().toString().padStart(2, '0');
                    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                    setMealTime(`${hours}:${minutes}`);
                  }
                }}
                textColor="#FFFFFF"
                themeVariant="dark"
              />
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-background-primary p-4 rounded-xl items-center"
                onPress={() => setShowMealModal(false)}
              >
                <Text className="text-zinc-400 font-bold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 p-4 rounded-xl items-center"
                style={{ backgroundColor: brandColors.primary.start }}
                onPress={handleSaveMeal}
              >
                <Text className="text-white font-bold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusModal
        visible={statusModal.visible}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenLayout>
  );
}
