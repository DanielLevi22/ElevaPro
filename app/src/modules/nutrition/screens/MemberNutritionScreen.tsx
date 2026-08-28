import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { colors } from '@/constants/colors';
import { useNutritionStore } from '../store/nutritionStore';

export function MemberNutritionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentDietPlan, fetchDietPlan } = useNutritionStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchDietPlan(user.id).finally(() => setIsLoading(false));
  }, [user?.id, fetchDietPlan]);

  const memberPlans = currentDietPlan ? [currentDietPlan] : [];

  return (
    <ScreenLayout>
      <View className="px-6 pt-4 pb-6">
        <Text className="text-4xl font-extrabold text-white mb-0.5 font-display tracking-tight">
          Minha Dieta
        </Text>
        <Text className="text-sm text-zinc-400 font-sans">Planejamento & Execução</Text>
      </View>

      {isLoading && memberPlans.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary.start} />
        </View>
      ) : memberPlans.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
            <Ionicons name="restaurant-outline" size={64} color="#52525B" />
          </View>
          <Text className="text-white text-xl font-bold mb-2 text-center font-display">
            Nenhum plano alimentar
          </Text>
          <Text className="text-zinc-400 text-center px-8 text-sm mb-8 font-sans">
            Crie seu primeiro plano alimentar personalizado.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/nutrition/create')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF2E63']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl py-3 px-6 shadow-lg shadow-orange-500/20"
            >
              <Text className="text-white text-base font-bold font-display">Criar Plano</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="px-6 gap-4">
          {memberPlans.map((plan) => (
            <View key={plan.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-3">
                  <Text className="text-white text-xl font-extrabold font-display leading-tight">
                    {plan.name || 'Plano Alimentar'}
                  </Text>
                  <Text className="text-zinc-500 text-xs font-sans mt-0.5">
                    {plan.target_calories
                      ? `${plan.target_calories} kcal/dia`
                      : 'Sem meta calórica'}
                  </Text>
                </View>
                <StatusBadge status={plan.status} />
              </View>

              <View className="flex-row gap-3 mb-4">
                {[
                  { label: 'PROT', value: plan.target_protein, color: 'text-emerald-400' },
                  { label: 'CARB', value: plan.target_carbs, color: 'text-purple-400' },
                  { label: 'GORD', value: plan.target_fat, color: 'text-amber-400' },
                ].map(({ label, value, color }) => (
                  <View key={label} className="flex-1 bg-zinc-950/50 p-2 rounded-xl items-center">
                    <Text className={`${color} text-[10px] font-bold mb-0.5`}>{label}</Text>
                    <Text className="text-white font-semibold text-xs">{value ?? '—'}g</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    console.log('[MemberNutritionScreen] Gerenciar plan.id:', plan.id);
                    router.push({
                      pathname: '/(tabs)/nutrition/[id]' as never,
                      params: { id: plan.id, planId: plan.id },
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-600 items-center"
                >
                  <Text className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
                    Gerenciar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/nutrition/follow')}
                  className="flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1"
                  style={{ backgroundColor: colors.primary.start }}
                >
                  <Ionicons name="play" size={12} color="white" />
                  <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                    Seguir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/nutrition/create')}
            className="flex-row items-center justify-center py-4 rounded-2xl border border-dashed border-zinc-700 mt-2"
          >
            <Ionicons name="add" size={18} color="#71717A" style={{ marginRight: 6 }} />
            <Text className="text-zinc-500 font-bold text-sm">Novo Plano</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenLayout>
  );
}
