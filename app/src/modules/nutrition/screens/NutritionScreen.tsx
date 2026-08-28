import type { DietPlan } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
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
import { colors as brandColors } from '@/constants/colors';
import { useNutritionStore } from '../store/nutritionStore';

export default function NutritionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { dietPlans, isLoading, fetchDietPlans } = useNutritionStore();
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchDietPlans(user.id);
      }
    }, [user?.id, fetchDietPlans])
  );

  const handlePressPlan = (studentId: string, planId: string) => {
    Haptics.selectionAsync();
    router.push(`/(tabs)/students/${studentId}/nutrition/${planId}`);
  };

  const handleCreatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: DietPlan & { student?: { full_name: string | null } };
    index: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()} layout={Layout.springify()}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handlePressPlan(item.student_id, item.id)}
        className="mb-4"
      >
        <View
          className="rounded-3xl p-6 border shadow-sm"
          style={{
            backgroundColor: brandColors.background.secondary,
            borderColor: brandColors.border.dark,
          }}
        >
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-1 mr-4">
              <Text className="text-white text-xl font-black font-display mb-1 leading-tight">
                {item.name}
              </Text>
              <Text className="text-zinc-500 text-sm font-sans line-clamp-2">
                {item.notes || 'Sem descrição'}
              </Text>
              {item.student?.full_name && (
                <View className="flex-row items-center mt-3">
                  <View className="bg-white/5 p-1 rounded-full mr-2">
                    <Ionicons name="person" size={12} color={brandColors.text.muted} />
                  </View>
                  <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                    {item.student.full_name}
                  </Text>
                </View>
              )}
            </View>
            <View
              className="px-3 py-1.5 rounded-full border"
              style={{
                backgroundColor:
                  item.status === 'active'
                    ? `${brandColors.status.success}15`
                    : brandColors.background.primary,
                borderColor:
                  item.status === 'active'
                    ? `${brandColors.status.success}30`
                    : brandColors.border.dark,
              }}
            >
              <Text
                className="text-[10px] font-black uppercase tracking-widest"
                style={{
                  color:
                    item.status === 'active' ? brandColors.status.success : brandColors.text.muted,
                }}
              >
                {item.status === 'active' ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>

          {/* Macros Summary - Premium Style */}
          <View className="flex-row gap-3 mb-6">
            <View
              className="flex-1 p-3 rounded-2xl items-center border"
              style={{
                backgroundColor: brandColors.background.primary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Text className="text-emerald-500 text-[9px] font-black uppercase tracking-widest mb-1">
                PROT
              </Text>
              <Text className="text-white font-bold text-sm tracking-tight">
                {item.target_protein}g
              </Text>
            </View>
            <View
              className="flex-1 p-3 rounded-2xl items-center border"
              style={{
                backgroundColor: brandColors.background.primary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Text className="text-blue-500 text-[9px] font-black uppercase tracking-widest mb-1">
                CARB
              </Text>
              <Text className="text-white font-bold text-sm tracking-tight">
                {item.target_carbs}g
              </Text>
            </View>
            <View
              className="flex-1 p-3 rounded-2xl items-center border"
              style={{
                backgroundColor: brandColors.background.primary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Text className="text-orange-500 text-[9px] font-black uppercase tracking-widest mb-1">
                GORD
              </Text>
              <Text className="text-white font-bold text-sm tracking-tight">
                {item.target_fat}g
              </Text>
            </View>
          </View>

          <View
            className="flex-row justify-between items-center pt-5 border-t"
            style={{ borderTopColor: brandColors.border.dark }}
          >
            <View
              className="flex-row items-center px-3 py-1.5 rounded-xl border"
              style={{
                backgroundColor: `${brandColors.primary.start}08`,
                borderColor: `${brandColors.primary.start}20`,
              }}
            >
              <Ionicons
                name="flame"
                size={14}
                color={brandColors.primary.start}
                style={{ marginRight: 6 }}
              />
              <Text
                className="font-black text-sm font-display tracking-tight"
                style={{ color: brandColors.primary.start }}
              >
                {item.target_calories}{' '}
                <Text className="text-[10px] font-bold uppercase tracking-widest">kcal</Text>
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-zinc-600 text-[10px] mr-2 font-black uppercase tracking-widest">
                {item.start_date ? new Date(item.start_date).toLocaleDateString() : '—'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={brandColors.text.disabled} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <ScreenLayout>
      {/* Large Title Header */}
      <View className="flex-row justify-between items-end px-6 pt-8 pb-6">
        <View>
          <Text className="text-4xl font-extrabold text-white font-display tracking-tight">
            Nutrição
          </Text>
          <Text className="text-base text-zinc-400 font-sans font-medium mt-1">
            Gestão de planos alimentares
          </Text>
        </View>

        <Link href={'/nutrition/create' as never} asChild>
          <TouchableOpacity activeOpacity={0.8} onPress={handleCreatePress}>
            <LinearGradient
              colors={brandColors.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-12 w-12 rounded-full items-center justify-center shadow-xl"
              style={{
                shadowColor: brandColors.primary.start,
                shadowOpacity: 0.3,
                shadowRadius: 10,
              }}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Content */}
      <FlatList
        data={dietPlans}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => user?.id && fetchDietPlans(user.id)}
            tintColor={brandColors.primary.start}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="flex-1 justify-center items-center py-20"
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
                Nenhum plano encontrado
              </Text>
              <Text className="text-zinc-400 text-center px-8 text-sm mb-8 font-sans leading-relaxed">
                Crie planos alimentares personalizados para seus alunos e acompanhe o progresso.
              </Text>

              <Link href={'/nutrition/create' as never} asChild>
                <TouchableOpacity activeOpacity={0.8} onPress={handleCreatePress}>
                  <LinearGradient
                    colors={brandColors.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl py-4 px-10 shadow-xl"
                    style={{
                      shadowColor: brandColors.primary.start,
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                    }}
                  >
                    <Text className="text-white text-base font-black font-display uppercase tracking-widest">
                      Criar Primeiro Plano
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          ) : (
            <View className="py-20">
              <ActivityIndicator size="large" color={brandColors.primary.start} />
            </View>
          )
        }
      />
    </ScreenLayout>
  );
}
