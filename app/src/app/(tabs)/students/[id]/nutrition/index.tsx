import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useNutritionStore } from '@/modules/nutrition/store/nutritionStore';

export default function StudentDietPlansScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { dietPlans, isLoading, fetchDietPlans, fetchDietPlan } = useNutritionStore();

  const studentId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (user?.id) {
      // Fetch all plans for the professional (we will filter locally)
      fetchDietPlans(user.id);
    }
  }, [user, fetchDietPlans]);

  // Filter plans for this specific student
  const studentPlans = dietPlans.filter((p) => p.student_id === studentId);

  // Also try to fetch the active one to ensure currentDietPlan is set when entering details
  useEffect(() => {
    if (studentId) {
      fetchDietPlan(studentId);
    }
  }, [studentId, fetchDietPlan]);

  const handlePressPlan = (item: { id: string }) => {
    // Use full-diet but ensure we likely want the specific plan.
    // Current full-diet implementation uses "currentDietPlan" from store.
    // We might need to select it first if full-diet relies on store state.
    // However, full-diet fetches active plan on mount.
    // If we want to view HISTORY plans, full-diet needs to support an ID param or we need a proper details screen.
    // For now, let's link to full-diet which shows the ACTIVE plan.
    // IF the user clicks a specific plan, we should probably set it as current?
    // Re-reading full-diet: It fetches "Active" plan.
    // If we want to view a specific plan (e.g. history), full-diet might need adjustment.
    // But user just wants to see "The Diet".

    router.push(`/(tabs)/students/${studentId}/nutrition/${item.id}`);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: {
      id: string;
      name: string | null;
      description?: string | null;
      status: string;
      target_protein: number | null;
      target_carbs: number | null;
      target_fat: number | null;
      target_calories: number | null;
      start_date: string | null;
    };
    index: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()} layout={Layout.springify()}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePressPlan(item)} className="mb-4">
        <View className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-white text-xl font-bold font-display mb-1 leading-tight">
                {item.name}
              </Text>
              <Text className="text-zinc-400 text-sm font-sans line-clamp-2">
                {item.description || 'Sem descrição'}
              </Text>
            </View>
            <View
              className={`px-3 py-1.5 rounded-full ${
                item.status === 'active' ? 'bg-emerald-500/15' : 'bg-zinc-800'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  item.status === 'active' ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {item.status === 'active' ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>

          {/* Macros Summary */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-zinc-950/50 p-2 rounded-xl items-center">
              <Text className="text-emerald-400 text-[10px] font-bold mb-0.5">PROT</Text>
              <Text className="text-white font-semibold text-xs">{item.target_protein}g</Text>
            </View>
            <View className="flex-1 bg-zinc-950/50 p-2 rounded-xl items-center">
              <Text className="text-purple-400 text-[10px] font-bold mb-0.5">CARB</Text>
              <Text className="text-white font-semibold text-xs">{item.target_carbs}g</Text>
            </View>
            <View className="flex-1 bg-zinc-950/50 p-2 rounded-xl items-center">
              <Text className="text-amber-400 text-[10px] font-bold mb-0.5">GORD</Text>
              <Text className="text-white font-semibold text-xs">{item.target_fat}g</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center pt-4 border-t border-zinc-800/50">
            <View className="flex-row items-center bg-orange-500/10 px-2 py-1 rounded-lg">
              <Ionicons name="flame" size={14} color="#FF6B35" style={{ marginRight: 4 }} />
              <Text className="text-[#FF6B35] font-bold text-xs">{item.target_calories} kcal</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-zinc-500 text-xs mr-1 font-medium">
                {item.start_date ? new Date(item.start_date).toLocaleDateString() : '—'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <ScreenLayout>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-extrabold text-white mb-1 font-display">
              Planos Alimentares
            </Text>
            <Text className="text-sm text-zinc-400 font-sans">Histórico e Ativos</Text>
          </View>
        </View>

        <Link href={`/nutrition/create?preselectedStudentId=${studentId}` as never} asChild>
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF6B35', '#FF2E63']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-12 w-12 rounded-full items-center justify-center shadow-lg shadow-orange-500/20"
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Content */}
      <FlatList
        data={studentPlans}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => user?.id && fetchDietPlans(user.id)}
            tintColor="#FF6B35"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 justify-center items-center py-20">
              <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
                <Ionicons name="restaurant-outline" size={64} color="#52525B" />
              </View>
              <Text className="text-white text-xl font-bold mb-2 text-center font-display">
                Nenhum plano alimentar
              </Text>
              <Text className="text-zinc-400 text-center px-8 text-sm mb-8 font-sans">
                Este aluno ainda não possui planos alimentares.
              </Text>

              <Link href={`/nutrition/create?preselectedStudentId=${studentId}` as never} asChild>
                <TouchableOpacity activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#FF6B35', '#FF2E63']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl py-3 px-6 shadow-lg shadow-orange-500/20"
                  >
                    <Text className="text-white text-base font-bold font-display">Criar Plano</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            <View className="py-20">
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          )
        }
      />
    </ScreenLayout>
  );
}
