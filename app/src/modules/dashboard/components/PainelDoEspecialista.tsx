import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { AvatarDoCabecalho } from '@/components/ui/AvatarDoCabecalho';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors as brandColors } from '@/constants/colors';
import { ROUTES } from '@/navigation/types';

/**
 * A Home do especialista.
 *
 * Saiu de `(tabs)/index.tsx` porque é outra tela inteira dentro do mesmo
 * arquivo: outro papel, outros dados, e nenhuma sobreposição com a do aluno
 * além do `if` que as separava. O arquivo passava de 500 linhas, e a #194
 * pedia mais um cartão na Home do aluno — extrair a metade que não ia crescer
 * era o caminho mais curto e o mais honesto.
 */
interface PainelDoEspecialistaProps {
  profile: { full_name?: string | null } | null;
  students: unknown[];
  workouts: unknown[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function PainelDoEspecialista({
  profile,
  students,
  workouts,
  isLoading,
  onRefresh,
}: PainelDoEspecialistaProps) {
  const router = useRouter();

  return (
    <ScreenLayout>
      {/* Ambient Top Light - Made extremely subtle */}
      <View className="absolute top-0 w-full h-[200px] pointer-events-none opacity-20">
        <LinearGradient colors={[brandColors.primary.start, 'transparent']} style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={brandColors.primary.start}
          />
        }
      >
        <View className="mb-8 flex-row justify-between items-start">
          <View>
            <Text className="text-zinc-500 text-[12px] font-bold mb-1 uppercase tracking-widest font-sans ml-1">
              Central de Comando
            </Text>
            <Text className="text-4xl font-extrabold text-white mb-2 font-display">Dashboard</Text>
          </View>
          <AvatarDoCabecalho profile={profile} />
        </View>

        <View className="gap-y-4">
          {/* Stats Grid */}
          <View className="flex-row gap-4">
            {/* Students Card - Clean Dark */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.TABS.STUDENTS)}
              activeOpacity={0.8}
              className="flex-1"
            >
              <View
                className="rounded-[24px] p-5 h-44 justify-between relative overflow-hidden border bg-zinc-900"
                style={{ borderColor: brandColors.border.default }}
              >
                <View className="bg-zinc-800 self-start p-2.5 rounded-xl">
                  <Ionicons name="people" size={20} color={brandColors.secondary.main} />
                </View>
                <View>
                  <Text className="text-white text-4xl font-black font-display tracking-tight">
                    {students.length}
                  </Text>
                  <Text className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase font-sans mt-1">
                    Alunos Ativos
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Workouts Card - Clean Dark */}
            <TouchableOpacity
              onPress={() => router.push(ROUTES.TABS.WORKOUTS)}
              activeOpacity={0.8}
              className="flex-1"
            >
              <View
                className="rounded-[24px] p-5 h-44 justify-between relative overflow-hidden border bg-zinc-900"
                style={{ borderColor: brandColors.border.default }}
              >
                <View className="bg-zinc-800 self-start p-2.5 rounded-xl">
                  <Ionicons name="barbell" size={20} color={brandColors.primary.start} />
                </View>
                <View>
                  <Text className="text-white text-4xl font-black font-display tracking-tight">
                    {workouts.length}
                  </Text>
                  <Text className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase font-sans mt-1">
                    Modelos
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Ranking Card - Full Width */}
          <TouchableOpacity onPress={() => router.push(ROUTES.TABS.RANKING)} activeOpacity={0.8}>
            <View
              className="rounded-[24px] p-5 flex-row items-center justify-between border bg-zinc-900"
              style={{ borderColor: brandColors.border.default }}
            >
              <View className="flex-row items-center gap-4">
                <View className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                  <Ionicons name="trophy" size={24} color="#EAB308" />
                </View>
                <View>
                  <Text className="text-white text-lg font-black font-display tracking-tight">
                    Ranking de Elite 🏆
                  </Text>
                  <Text className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase font-sans">
                    Competição Semanal
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={brandColors.text.muted} />
            </View>
          </TouchableOpacity>

          {/* Quick Action - Premium Solid Button */}
          <TouchableOpacity
            onPress={() => router.push(ROUTES.STUDENTS.CREATE)}
            activeOpacity={0.8}
            className="mt-2 text-center"
          >
            <View style={{ borderRadius: 24, overflow: 'hidden' }}>
              <LinearGradient
                colors={[brandColors.primary.start, brandColors.primary.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="p-5 flex-row items-center justify-center shadow-lg shadow-orange-500/30"
              >
                <Ionicons name="person-add" size={22} color="white" style={{ marginRight: 10 }} />
                <Text className="text-white text-base font-black font-display uppercase tracking-widest">
                  Novo Aluno
                </Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
