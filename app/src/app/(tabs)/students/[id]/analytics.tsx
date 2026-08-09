import { createGamificationService, type DailyGoal } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ConsistencyHeatmap } from '@/components/gamification/ConsistencyHeatmap';
import { StudentNutritionAnalytics } from '@/components/nutrition/StudentNutritionAnalytics';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { WorkoutAnalytics } from '@/components/workout/WorkoutAnalytics';

const gamificationService = createGamificationService(supabase);

type Tab = 'overview' | 'workouts' | 'nutrition';

export default function StudentAnalyticsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const studentId = Array.isArray(id) ? id[0] : id;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [overviewHistory, setOverviewHistory] = useState<DailyGoal[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'overview' && studentId) {
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        const startDateObj = new Date();
        startDateObj.setDate(today.getDate() - 120); // 4 months
        const startDate = startDateObj.toISOString().split('T')[0];

        gamificationService
          .getWeeklyGoals(startDate, endDate, studentId)
          .then((data) => setOverviewHistory(data || []));
      }
    }, [activeTab, studentId])
  );

  if (!studentId) return null;

  return (
    <ScreenLayout>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between p-6 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold font-display">Desempenho Geral</Text>
          <View className="w-10" />
        </View>

        {/* Tabs */}
        <View className="flex-row px-6 mb-6 gap-2">
          <TabButton
            label="Geral"
            isActive={activeTab === 'overview'}
            onPress={() => setActiveTab('overview')}
          />
          <TabButton
            label="Treinos"
            isActive={activeTab === 'workouts'}
            onPress={() => setActiveTab('workouts')}
          />
          <TabButton
            label="Nutrição"
            isActive={activeTab === 'nutrition'}
            onPress={() => setActiveTab('nutrition')}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 0 }}>
          {activeTab === 'overview' && (
            <View className="gap-6">
              <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                <ConsistencyHeatmap history={overviewHistory} />
              </View>

              <View className="bg-zinc-900/50 p-6 rounded-3xl items-center justify-center border border-dashed border-zinc-800">
                <Text className="text-zinc-600 text-center">
                  Mais métricas gerais (Hábitos, Peso, Medidas) serão adicionadas aqui.
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'workouts' && <WorkoutAnalytics studentId={studentId} />}

          {activeTab === 'nutrition' && <StudentNutritionAnalytics studentId={studentId} />}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

function TabButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 py-3 rounded-xl items-center justify-center ${isActive ? 'bg-zinc-800 border border-zinc-700' : 'bg-transparent'}`}
    >
      <Text className={`font-bold ${isActive ? 'text-white' : 'text-zinc-500'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
