import { createGamificationService, type DailyGoal } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ConsistencyHeatmap } from '@/components/gamification/ConsistencyHeatmap';

const gamificationService = createGamificationService(supabase);

const SCREEN_WIDTH = Dimensions.get('window').width;
const _CHART_WIDTH = SCREEN_WIDTH - 80;

const _Placeholder = ({ text }: { text: string }) => (
  <View className="h-40 justify-center items-center bg-zinc-900 border border-zinc-800 rounded-3xl mb-4">
    <Text className="text-zinc-600 font-sans">{text}</Text>
  </View>
);

export function StudentNutritionAnalytics({ studentId }: { studentId: string }) {
  const [history, setHistory] = useState<DailyGoal[]>([]);
  const [stats, setStats] = useState({
    adherence: 0,
    completedDays: 0,
    totalDays: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      const startDateObj = new Date();
      startDateObj.setDate(today.getDate() - 28); // Last 4 weeks
      const startDate = startDateObj.toISOString().split('T')[0];

      const data = await gamificationService.getWeeklyGoals(startDate, endDate, studentId);
      setHistory(data || []);

      // Calculate stats
      if (data && data.length > 0) {
        const total = data.length;
        const completed = data.filter(
          (d) => (d.meals_completed || 0) >= (d.meals_target || 1)
        ).length;

        setStats({
          adherence: (completed / total) * 100,
          completedDays: completed,
          totalDays: total,
        });
      }
    } catch (error) {
      console.error('Error loading nutrition analytics:', error);
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <Animated.View entering={FadeInDown.delay(300).springify()} className="gap-6 pb-20">
      {/* Header Stats */}
      <View className="flex-row gap-4">
        <View className="flex-1 bg-zinc-900 p-4 rounded-2xl border border-zinc-800 items-center">
          <Text className="text-zinc-500 text-xs font-bold mb-1 uppercase tracking-wider">
            Aderência (28d)
          </Text>
          <Text
            className={`text-2xl font-black ${stats.adherence >= 80 ? 'text-emerald-400' : stats.adherence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}
          >
            {stats.adherence.toFixed(0)}%
          </Text>
        </View>
        <View className="flex-1 bg-zinc-900 p-4 rounded-2xl border border-zinc-800 items-center">
          <Text className="text-zinc-500 text-xs font-bold mb-1 uppercase tracking-wider">
            Dias na Meta
          </Text>
          <Text className="text-white text-2xl font-black">
            {stats.completedDays}
            <Text className="text-zinc-600 text-base">/{stats.totalDays}</Text>
          </Text>
        </View>
      </View>

      {/* Heatmap (Specific for Nutrition if possible, otherwise general) */}
      <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <Text className="text-white text-sm font-bold leading-tight uppercase tracking-wider text-zinc-400 mb-4">
          Consistência na Dieta
        </Text>
        {/* We can modify ConsistencyHeatmap to accept specific key checks, but for now passing raw history is fine as it checks meals too */}
        <ConsistencyHeatmap history={history} />
      </View>

      {/* Placeholder for Macro Trends (Requires deeper query) */}
      {/* <Placeholder text="Tendência de Calorias (Em Breve)" /> */}
    </Animated.View>
  );
}
