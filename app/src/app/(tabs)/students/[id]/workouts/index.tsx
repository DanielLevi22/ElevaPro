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
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useWorkoutStore } from '@/modules/workout/store/workoutStore';

export default function StudentWorkoutsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { periodizations, isLoading, fetchPeriodizations } = useWorkoutStore();

  const studentId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (user?.id) {
      // Fetch all periodizations for the professional
      fetchPeriodizations(user.id);
    }
  }, [user, fetchPeriodizations]);

  // Filter periodizations for this specific student
  const studentPeriodizations = periodizations.filter((p) => p.student_id === studentId);

  const renderItem = ({
    item,
  }: {
    item: {
      id: string;
      name: string;
      description?: string;
      status: string;
      start_date: string | null;
      end_date: string | null;
    };
  }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/(tabs)/students/${studentId}/workouts/${item.id}`)}
      className="mb-4"
    >
      <View className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-white text-lg font-bold font-display mb-1">{item.name}</Text>
            <Text className="text-zinc-400 text-sm font-sans" numberOfLines={2}>
              {item.description || 'Sem descrição'}
            </Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${
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

        <View className="flex-row items-center gap-4 mt-2">
          <View className="flex-row items-center">
            <Ionicons
              name="calendar-outline"
              size={16}
              color="#CCFF00"
              style={{ marginRight: 6 }}
            />
            <Text className="text-zinc-300 text-xs font-bold">
              {item.start_date ? new Date(item.start_date).toLocaleDateString() : '—'} -{' '}
              {item.end_date ? new Date(item.end_date).toLocaleDateString() : '—'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
              Periodizações
            </Text>
            <Text className="text-sm text-zinc-400 font-sans">Gerenciar treinos do aluno</Text>
          </View>
        </View>

        <Link
          href={`/(tabs)/workouts/create-periodization?studentId=${studentId}` as never}
          asChild
        >
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={['#CCFF00', '#A3CC00']}
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
        data={studentPeriodizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => user?.id && fetchPeriodizations(user.id)}
            tintColor="#CCFF00"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 justify-center items-center py-20">
              <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
                <Ionicons name="calendar-outline" size={64} color="#52525B" />
              </View>
              <Text className="text-white text-xl font-bold mb-2 text-center font-display">
                Nenhuma periodização
              </Text>
              <Text className="text-zinc-400 text-center px-8 text-sm mb-8 font-sans">
                Este aluno ainda não possui periodizações ativas ou planejadas.
              </Text>

              <Link
                href={`/(tabs)/workouts/create-periodization?studentId=${studentId}` as never}
                asChild
              >
                <TouchableOpacity activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#CCFF00', '#A3CC00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl py-3 px-6 shadow-lg shadow-orange-500/20"
                  >
                    <Text className="text-white text-base font-bold font-display">
                      Criar Periodização
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            <View className="py-20">
              <ActivityIndicator size="large" color="#CCFF00" />
            </View>
          )
        }
      />
    </ScreenLayout>
  );
}
