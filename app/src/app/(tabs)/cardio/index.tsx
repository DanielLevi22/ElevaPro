import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';

// Cor aqui separa modalidade, não é cor de marca: por isso a lista não vira
// tudo lime. As duas primeiras ainda carregavam a paleta coral antiga e foram
// trocadas pelas do design (cyber-blue e lime), mantendo as cinco distinguíveis.
const CARDIO_ACTIVITIES = [
  { id: 'walk', name: 'Caminhada', icon: 'walk', met: 3.5, color: ['#00F0FF', '#00C0CC'] },
  { id: 'run', name: 'Corrida', icon: 'speedometer', met: 8.0, color: ['#CCFF00', '#A3CC00'] },
  { id: 'bike', name: 'Bicicleta', icon: 'bicycle', met: 6.0, color: ['#10B981', '#059669'] },
  { id: 'elliptical', name: 'Elíptico', icon: 'fitness', met: 5.0, color: ['#8B5CF6', '#7C3AED'] },
  { id: 'swim', name: 'Natação', icon: 'water', met: 7.0, color: ['#3B82F6', '#2563EB'] },
];

export default function CardioSelectionScreen() {
  const router = useRouter();

  return (
    <ScreenLayout>
      <View className="px-6 pt-8 pb-4 flex-row items-center">
        <View className="mr-4">
          <IconButton icon="arrow-back" accessibilityLabel="Voltar" onPress={() => router.back()} />
        </View>
        <View>
          <Text className="text-3xl font-extrabold text-white font-display tracking-tight">
            Cardio
          </Text>
          <Text className="text-zinc-400 font-sans font-medium mt-1">Escolha sua atividade</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {CARDIO_ACTIVITIES.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              activeOpacity={0.8}
              className="w-[48%]"
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/workouts/cardio/[id]',
                  params: {
                    id: 'freestyle', // Placeholder ID
                    exerciseId: null,
                    exerciseName: activity.name,
                    muscleGroup: 'Cardio',
                  },
                });
              }}
            >
              <LinearGradient
                colors={activity.color as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl p-4 h-40 justify-between shadow-lg"
              >
                <View className="bg-white/20 self-start p-2 rounded-xl">
                  <Ionicons
                    name={activity.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color="white"
                  />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg font-display">{activity.name}</Text>
                  <Text className="text-white/80 text-xs font-sans">~{activity.met} METs</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-8 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <View className="flex-row items-center mb-4">
            <Ionicons name="information-circle" size={24} color={colors.primary.solid} />
            <Text className="text-white font-bold text-lg ml-3 font-display">Como funciona?</Text>
          </View>
          <Text className="text-zinc-400 leading-relaxed font-sans">
            Selecione uma atividade acima para iniciar uma sessão de cardio livre. O app irá
            monitorar o tempo e estimar as calorias gastas com base no tipo de exercício.
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
