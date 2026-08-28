import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealCard } from '@/modules/nutrition/components/MealCard';
import FoodSearchScreen, { type FoodItem } from '@/modules/nutrition/screens/FoodSearchScreen';
import { useNutritionStore } from '@/modules/nutrition/store/nutritionStore';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

const MEAL_TYPES = [
  { type: 'breakfast', label: 'Café da Manhã', order: 1 },
  { type: 'morning_snack', label: 'Lanche da Manhã', order: 2 },
  { type: 'lunch', label: 'Almoço', order: 3 },
  { type: 'afternoon_snack', label: 'Lanche da Tarde', order: 4 },
  { type: 'dinner', label: 'Janta', order: 5 },
  { type: 'evening_snack', label: 'Ceia', order: 6 },
];

export default function DietaCompletaScreen() {
  const { id: studentId } = useLocalSearchParams();
  const router = useRouter();

  const {
    currentDietPlan,
    meals,
    mealItems,
    fetchDietPlan,
    fetchMeals,
    fetchMealItems,
    addMeal,
    updateMeal,
    addFoodToMeal,
    updateMealItem,
    removeFoodFromMeal,
    isLoading,
  } = useNutritionStore();

  const [selectedDay, setSelectedDay] = useState(1); // Segunda-feira por padrão
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);

  useEffect(() => {
    const loadDietData = async () => {
      if (!studentId || typeof studentId !== 'string') {
        console.error('❌ Invalid studentId:', studentId);
        return;
      }

      console.log('📡 Fetching diet plan for:', studentId);
      await fetchDietPlan(studentId);
    };

    console.log('🔄 FullDietScreen mounted. StudentId:', studentId);
    loadDietData();
  }, [studentId, fetchDietPlan]);

  useEffect(() => {
    if (currentDietPlan) {
      fetchMeals(currentDietPlan.id);
    }
  }, [currentDietPlan, fetchMeals]);

  useEffect(() => {
    // Load meal items for all meals
    for (const meal of meals) {
      if (!mealItems[meal.id]) {
        fetchMealItems(meal.id);
      }
    }
  }, [meals, mealItems, fetchMealItems]);

  const handleAddMeal = async (mealType: string, order: number) => {
    if (!currentDietPlan) {
      Alert.alert('Erro', 'Nenhum plano de dieta ativo encontrado.');
      return;
    }

    try {
      const mealConfig = MEAL_TYPES.find((m) => m.type === mealType);
      await addMeal({
        diet_plan_id: currentDietPlan.id,
        name: mealConfig?.label ?? mealType,
        day_of_week: selectedDay,
        meal_type: mealType,
        meal_order: order,
      });
    } catch (_error) {
      Alert.alert('Erro', 'Não foi possível adicionar a refeição.');
    }
  };

  const handleUpdateMealTime = async (mealId: string, mealTime: string) => {
    try {
      await updateMeal(mealId, { meal_time: mealTime });
    } catch (_error) {
      Alert.alert('Erro', 'Não foi possível atualizar o horário.');
    }
  };

  const handleAddFoodToMeal = (mealId: string) => {
    setSelectedMealId(mealId);
    setShowFoodSearch(true);
  };

  const handleSelectFood = (food: FoodItem) => {
    if (!selectedMealId) return;

    try {
      // Por padrão, adiciona 100g do alimento
      addFoodToMeal(selectedMealId, food.id, 100, 'g');
      setSelectedMealId(null);
    } catch (_error) {
      Alert.alert('Erro', 'Não foi possível adicionar o alimento.');
    }
  };

  const handleUpdateFood = async (itemId: string, quantity: number) => {
    try {
      await updateMealItem(itemId, { quantity });
    } catch (_error) {
      Alert.alert('Erro', 'Não foi possível atualizar o alimento.');
    }
  };

  const handleRemoveFood = async (itemId: string) => {
    Alert.alert('Remover Alimento', 'Tem certeza que deseja remover este alimento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFoodFromMeal(itemId);
          } catch (_error) {
            Alert.alert('Erro', 'Não foi possível remover o alimento.');
          }
        },
      },
    ]);
  };

  // Filter meals for selected day
  const dayMeals = meals.filter((meal) => meal.day_of_week === selectedDay);

  // Calculate total macros for the day
  const dayTotalMacros = dayMeals.reduce(
    (total, meal) => {
      const items = mealItems[meal.id] || [];
      items.forEach((item) => {
        if (item.food) {
          const multiplier = item.quantity / item.food.serving_size;
          total.calories += (item.food.calories ?? 0) * multiplier;
          total.protein += (item.food.protein ?? 0) * multiplier;
          total.carbs += (item.food.carbs ?? 0) * multiplier;
          total.fat += (item.food.fat ?? 0) * multiplier;
        }
      });
      return total;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CCFF00" />
        <Text style={styles.loadingText}>Carregando dieta...</Text>
      </View>
    );
  }

  if (!currentDietPlan) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="restaurant-outline" size={80} color="#52525B" />
        <Text style={styles.emptyTitle}>Nenhum plano de dieta ativo</Text>
        <Text style={styles.emptyText}>Crie um plano de dieta para começar</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push(`/(tabs)/students/${studentId}/nutrition/create`)}
        >
          <LinearGradient
            colors={['#CCFF00', '#A3CC00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonText}>Criar Plano de Dieta</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Dieta Completa</Text>
            <Text style={styles.headerSubtitle}>{currentDietPlan.name}</Text>
          </View>
        </View>

        {/* Day Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daySelector}
          contentContainerStyle={styles.daySelectorContent}
        >
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day.value}
              style={[styles.dayButton, selectedDay === day.value && styles.dayButtonActive]}
              onPress={() => setSelectedDay(day.value)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  selectedDay === day.value && styles.dayButtonTextActive,
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Day Totals */}
        <View style={styles.dayTotals}>
          <Text style={styles.dayTotalsTitle}>Totais do Dia</Text>
          <View style={styles.macrosRow}>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{dayTotalMacros.calories.toFixed(0)}</Text>
              <Text style={styles.macroLabel}>kcal</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={[styles.macroValue, { color: '#00ff9d' }]}>
                {dayTotalMacros.protein.toFixed(0)}g
              </Text>
              <Text style={styles.macroLabel}>Proteína</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={[styles.macroValue, { color: '#7f5aff' }]}>
                {dayTotalMacros.carbs.toFixed(0)}g
              </Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroBox}>
              <Text style={[styles.macroValue, { color: '#ffde59' }]}>
                {dayTotalMacros.fat.toFixed(0)}g
              </Text>
              <Text style={styles.macroLabel}>Gordura</Text>
            </View>
          </View>
        </View>

        {/* Meals List */}
        <ScrollView
          style={styles.mealsList}
          contentContainerStyle={styles.mealsListContent}
          showsVerticalScrollIndicator={false}
        >
          {MEAL_TYPES.map((mealType) => {
            const meal = dayMeals.find((m) => m.meal_type === mealType.type);

            if (meal) {
              return (
                <MealCard
                  key={meal.id}
                  meal={{
                    ...meal,
                    name: meal.name || mealType.label,
                    meal_time: meal.meal_time ?? undefined,
                  }}
                  items={mealItems[meal.id] || []}
                  onAddFood={() => handleAddFoodToMeal(meal.id)}
                  onRemoveFood={handleRemoveFood}
                  onUpdateMealTime={handleUpdateMealTime}
                  onUpdateFood={handleUpdateFood}
                  isEditable={true}
                />
              );
            }

            // Show "Add Meal" button if meal doesn't exist
            return (
              <TouchableOpacity
                key={mealType.type}
                style={styles.addMealButton}
                onPress={() => handleAddMeal(mealType.type, mealType.order)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#00FF88" />
                <Text style={styles.addMealText}>Adicionar {mealType.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Food Search Modal */}
        <Modal
          visible={showFoodSearch}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowFoodSearch(false)}
        >
          <FoodSearchScreen
            onClose={() => {
              setShowFoodSearch(false);
              setSelectedMealId(null);
            }}
            onSelect={handleSelectFood}
          />
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B', // Zinc 950
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#A1A1AA', // Zinc 400
    marginTop: 16,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 8,
    fontFamily: 'GeneralSans-Bold',
  },
  emptyText: {
    fontSize: 15,
    color: '#A1A1AA', // Zinc 400
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'GeneralSans-Regular',
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'GeneralSans-Bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    backgroundColor: '#18181B', // Zinc 900
    padding: 10,
    borderRadius: 12,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'ClashDisplay-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A1A1AA', // Zinc 400
    marginTop: 4,
    fontFamily: 'GeneralSans-Medium',
  },
  daySelector: {
    maxHeight: 60,
  },
  daySelectorContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#18181B', // Zinc 900
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
  },
  dayButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)', // Orange tint
    borderColor: '#CCFF00', // Orange
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1AA', // Zinc 400
    fontFamily: 'GeneralSans-Semibold',
  },
  dayButtonTextActive: {
    color: '#CCFF00', // Orange
  },
  dayTotals: {
    backgroundColor: '#18181B', // Zinc 900
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
  },
  dayTotalsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: 'GeneralSans-Bold',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBox: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'ClashDisplay-Semibold',
  },
  macroLabel: {
    fontSize: 11,
    color: '#A1A1AA', // Zinc 400
    fontFamily: 'GeneralSans-Medium',
  },
  mealsList: {
    flex: 1,
    marginTop: 16,
  },
  mealsListContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B', // Zinc 900
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
    borderStyle: 'dashed',
    paddingVertical: 16,
    marginBottom: 12,
  },
  addMealText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCFF00',
    marginLeft: 8,
    fontFamily: 'GeneralSans-Semibold',
  },
});
