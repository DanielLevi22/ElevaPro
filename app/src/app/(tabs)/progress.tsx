// Imports

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/auth';
import { ConsistencyHeatmap } from '@/components/gamification/ConsistencyHeatmap';
import { DailyMacroCard } from '@/components/nutrition/DailyMacroCard';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { WorkoutAnalytics } from '@/components/workout/WorkoutAnalytics';
import { useGamificationStore } from '@/modules/gamification/store/gamificationStore';
import { useNutritionStore } from '@/modules/nutrition/store/nutritionStore';
import { ROUTES } from '@/navigation/types';

// Helper Component for Nutrition Tab to isolate hooks
const NutritionTabContent = () => {
  const { user } = useAuthStore();
  const { currentDietPlan, mealItems, dailyLogs, fetchDailyLogs, fetchDietPlan, fetchMeals } =
    useNutritionStore();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        const today = new Date().toISOString().split('T')[0];
        fetchDailyLogs(user.id, today);

        if (!currentDietPlan) {
          fetchDietPlan(user.id);
        } else if (currentDietPlan.id && Object.keys(mealItems).length === 0) {
          // Check if we need to fetch meals (if plan exists but items don't)
          fetchMeals(currentDietPlan.id);
        }
      }
    }, [
      user,
      currentDietPlan,
      mealItems,
      fetchDailyLogs,
      fetchDietPlan, // Check if we need to fetch meals (if plan exists but items don't)
      fetchMeals,
    ])
  );

  // Calculate Consumed Macros
  const consumed = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    // Iterate through all meals content to match with logs
    // Note: Ideally we should use the logs to drive this, but logs point to meal_ids

    Object.values(dailyLogs).forEach((log) => {
      if (log.completed && log.diet_meal_id) {
        // Find the items for this meal
        const items = mealItems[log.diet_meal_id] || [];

        items.forEach((item) => {
          if (item.food) {
            const ratio = item.quantity / (item.food.serving_size || 100);
            calories += (item.food.calories ?? 0) * ratio;
            protein += (item.food.protein ?? 0) * ratio;
            carbs += (item.food.carbs ?? 0) * ratio;
            fat += (item.food.fat ?? 0) * ratio;
          }
        });
      }
    });

    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    };
  }, [dailyLogs, mealItems]);

  return (
    <DailyMacroCard
      calories={consumed.calories}
      carbs={consumed.carbs}
      protein={consumed.protein}
      fat={consumed.fat}
    />
  );
};

export default function ProgressScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { weeklyGoals, history, fetchDailyData, fetchHistory, isLoading } = useGamificationStore();
  const [activeTab, setActiveTab] = useState<'GERAL' | 'NUTRICAO' | 'TREINO'>('GERAL');

  const tabs = [
    { id: 'GERAL', label: 'Visão Geral' },
    { id: 'NUTRICAO', label: 'Nutrição' },
    { id: 'TREINO', label: 'Treinos' },
  ];

  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      fetchDailyData(today);
      fetchHistory(120); // 4 months
    }
  }, [user, fetchDailyData, fetchHistory]);

  // Calculate Streak (Simulated for visualization if not in store)
  // Assuming 'weeklyGoals' has completion data, we can count consecutive days met
  const streakDays = weeklyGoals.filter(
    (d) =>
      (d.meals_completed >= d.meals_target && d.meals_target > 0) ||
      (d.workout_completed >= d.workout_target && d.workout_target > 0)
  ).length;

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              const today = new Date().toISOString().split('T')[0];
              fetchDailyData(today);
              fetchHistory(120);
            }}
            tintColor="#FF6B35"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="mb-6 mt-2 flex-row justify-between items-center"
        >
          <View>
            <Text className="text-3xl font-extrabold text-white mb-1 font-display tracking-tight">
              Seu Progresso
            </Text>
            <Text className="text-sm text-zinc-400 font-sans font-medium">
              Cada dia conta na sua jornada
            </Text>
          </View>
          <View className="w-12 h-12 bg-zinc-800 rounded-full items-center justify-center border border-zinc-700">
            <Text className="text-2xl">🔥</Text>
          </View>
        </Animated.View>

        {/* Custom Segmented Control */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          className="flex-row bg-zinc-900/80 p-1 rounded-2xl mb-8 border border-zinc-800"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as 'GERAL' | 'NUTRICAO' | 'TREINO')}
                className={`flex-1 py-2.5 items-center rounded-xl ${isActive ? 'bg-zinc-800' : 'bg-transparent'}`}
              >
                <Text className={`font-bold text-xs ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* --- TAB: GERAL --- */}
        {activeTab === 'GERAL' && (
          <>
            {/* Hero Streak Card */}
            <Animated.View entering={FadeInDown.delay(200).springify()} className="mb-8">
              <LinearGradient
                colors={['#FF6B35', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-3xl p-6 relative overflow-hidden"
              >
                {/* Background Pattern */}
                <View className="absolute -right-10 -top-10 opacity-20">
                  <Ionicons name="flame" size={150} color="white" />
                </View>

                <View className="flex-row justify-between items-start mb-4">
                  <View>
                    <Text className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">
                      Sequência Atual
                    </Text>
                    <Text className="text-white text-5xl font-black font-display">
                      {streakDays} <Text className="text-3xl font-bold">dias</Text>
                    </Text>
                  </View>
                  <View className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <Ionicons name="trending-up" size={24} color="white" />
                  </View>
                </View>

                <View className="bg-black/10 rounded-xl p-3 flex-row items-center gap-3">
                  <Ionicons name="information-circle-outline" size={20} color="white" />
                  <Text className="text-white/90 text-xs flex-1 leading-relaxed">
                    Mantenha o foco! Você está construindo uma rotina imbatível.
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Stats Row Premium */}
            <Animated.View
              entering={FadeInDown.delay(250).springify()}
              className="flex-row justify-between mb-8"
            >
              {/* Workout Frequency */}
              <View className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 w-[31%] items-center overflow-hidden relative">
                <View className="absolute top-0 w-full h-1 bg-orange-500 opacity-80" />
                <Text className="text-2xl mb-2 mt-1">🔥</Text>
                <Text className="text-white font-black text-xl font-display">
                  {weeklyGoals.reduce((acc, curr) => acc + curr.workout_completed, 0)}
                </Text>
                <Text className="text-zinc-500 text-[9px] uppercase font-bold text-center tracking-wider mt-1">
                  Treinos
                </Text>
              </View>

              {/* Diet Adherence */}
              <View className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 w-[31%] items-center overflow-hidden relative">
                <View className="absolute top-0 w-full h-1 bg-emerald-500 opacity-80" />
                <Text className="text-2xl mb-2 mt-1">🥗</Text>
                <Text className="text-white font-black text-xl font-display">
                  {(() => {
                    const totalCompleted = weeklyGoals.reduce(
                      (acc, curr) => acc + curr.meals_completed,
                      0
                    );
                    const totalTarget = weeklyGoals.reduce(
                      (acc, curr) => acc + curr.meals_target,
                      0
                    );
                    return totalTarget > 0
                      ? `${Math.round((totalCompleted / totalTarget) * 100)}%`
                      : '0%';
                  })()}
                </Text>
                <Text className="text-zinc-500 text-[9px] uppercase font-bold text-center tracking-wider mt-1">
                  Aderência
                </Text>
              </View>

              {/* Perfect Days */}
              <View className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 w-[31%] items-center overflow-hidden relative">
                <View className="absolute top-0 w-full h-1 bg-purple-500 opacity-80" />
                <Text className="text-2xl mb-2 mt-1">⭐️</Text>
                <Text className="text-white font-black text-xl font-display">
                  {
                    weeklyGoals.filter(
                      (d) =>
                        d.meals_completed >= d.meals_target &&
                        d.meals_target > 0 &&
                        d.workout_completed >= d.workout_target &&
                        d.workout_target > 0
                    ).length
                  }
                </Text>
                <Text className="text-zinc-500 text-[9px] uppercase font-bold text-center tracking-wider mt-1">
                  Dias Top
                </Text>
              </View>
            </Animated.View>

            {/* Heatmap */}
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <ConsistencyHeatmap history={history} />
            </Animated.View>
          </>
        )}

        {/* --- TAB: NUTRITION --- */}
        {activeTab === 'NUTRICAO' && <NutritionTabContent />}

        {/* --- TAB: WORKOUT --- */}
        {activeTab === 'TREINO' && (
          <>
            {/* Workout Analytics (Full Size) */}
            <WorkoutAnalytics />

            {/*
              O gráfico mostra a tendência; esta porta leva à sessão. É o único
              caminho do aluno para o que ele escreveu — e, desde a `0036`, para
              corrigir (Art. 18, III). Sem ela o direito existe no banco e não
              existe no produto.
            */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.STUDENT.SESSION_HISTORY)}
              accessibilityRole="button"
              className="flex-row items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-4"
              activeOpacity={0.8}
            >
              <View className="flex-1 pr-3">
                <Text className="text-white font-bold font-display">Meus treinos</Text>
                <Text className="text-zinc-500 text-xs mt-0.5">
                  Ver o histórico e corrigir o que você escreveu
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#71717A" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
