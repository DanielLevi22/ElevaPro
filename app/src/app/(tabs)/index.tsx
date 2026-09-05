import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ImageSourcePropType, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/auth';
import { ConfettiOverlay } from '@/components/gamification/ConfettiOverlay';
import { ProgressCard } from '@/components/gamification/ProgressCard';
import { StatCard } from '@/components/gamification/StatCard';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { WeeklyProgress } from '@/components/gamification/WeeklyProgress';
import { AvatarDoCabecalho } from '@/components/ui/AvatarDoCabecalho';
import { CartaoDeEntrada } from '@/components/ui/CartaoDeEntrada';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors as brandColors } from '@/constants/colors';
import { useHealthData } from '@/hooks/useHealthData';
import { useAssessmentStore } from '@/modules/assessment/store/assessmentStore';
import { PainelDoEspecialista } from '@/modules/dashboard/components/PainelDoEspecialista';
import { useGamificationStore } from '@/modules/gamification/store/gamificationStore';
import { useStudentStore } from '@/modules/students';
import { useWorkoutStore } from '@/modules/workout';
import { ROUTES } from '@/navigation/types';
import { getLocalDateISOString } from '@/utils/dateUtils';

const MUSCLE_IMAGES: Record<string, ImageSourcePropType> = {
  Peito: require('../../../assets/workouts/chest.jpg'),
  Costas: require('../../../assets/workouts/back.jpg'),
  Pernas: require('../../../assets/workouts/legs.jpg'),
  Braços: require('../../../assets/workouts/arms.jpg'),
  Ombros: require('../../../assets/workouts/shoulders.jpg'),
  Abs: require('../../../assets/workouts/abs.jpg'),
  Geral: require('../../../assets/workouts/chest.jpg'),
};

// Colunas de `profiles` são nuláveis no banco, não `undefined`: o perfil nasce
// no signup com quase tudo em branco.
interface ProfileData {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
}

interface SuggestedWorkout {
  id: string;
  title: string;
  muscle_group?: string | null;
  duration_minutes?: number;
}

export default function DashboardScreen() {
  const { user, accountType } = useAuthStore();
  const {
    dailyGoal,
    weeklyGoals,
    streak,
    showConfetti,
    fetchDailyData,
    isLoading: gamificationLoading,
  } = useGamificationStore();
  const {
    steps,
    calories,
    source: healthSource,
    refetch: refetchHealth,
    loading: _healthLoading,
  } = useHealthData();

  // Professional Data Stores
  const { students, fetchStudents, isLoading: studentsLoading } = useStudentStore();
  const { workouts, fetchWorkouts, isLoading: workoutsLoading } = useWorkoutStore();
  const { anamnesisResponses, isAnamnesisSubmitted } = useAssessmentStore();

  const anamnese = isAnamnesisSubmitted
    ? { cor: '#10B981', icone: 'checkmark-circle' as const, legenda: 'Concluído' }
    : Object.keys(anamnesisResponses).length > 0
      ? { cor: '#F59E0B', icone: 'document-text' as const, legenda: 'Em Andamento' }
      : { cor: '#A855F7', icone: 'document-text' as const, legenda: 'Ficha de Saúde' };

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [suggestedWorkout, setSuggestedWorkout] = useState<SuggestedWorkout | null>(null);
  const router = useRouter();

  const isLoading = gamificationLoading || studentsLoading || workoutsLoading;

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    setProfile(profileData);

    if (accountType === 'specialist') {
      // Fetch Professional Data
      await Promise.all([fetchStudents(user.id), fetchWorkouts(user.id)]);
    } else {
      // Fetch Student Data (Gamification & Health & Workouts)
      const today = getLocalDateISOString();
      await Promise.all([fetchDailyData(today), fetchWorkouts(user.id), refetchHealth()]);
    }
  }, [user?.id, accountType, fetchStudents, fetchWorkouts, fetchDailyData, refetchHealth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (accountType !== 'specialist' && workouts.length > 0) {
      // Logic for suggested workout: pick the first one for now
      setSuggestedWorkout(workouts[0]);
    }
  }, [workouts, accountType]);

  if (isLoading && !profile && !accountType) {
    return (
      <ScreenLayout className="justify-center items-center">
        <View
          className="p-5 rounded-full mb-4 border"
          style={{
            backgroundColor: brandColors.background.secondary,
            borderColor: brandColors.border.default,
          }}
        >
          <Ionicons name="barbell" size={48} color={brandColors.primary.start} />
        </View>
        <Text className="text-white text-lg font-bold font-display">Carregando...</Text>
      </ScreenLayout>
    );
  }

  // O painel do especialista é outra tela: outro papel, outros dados, e
  // nenhuma sobreposição com a do aluno além do arquivo em que moravam.
  if (accountType === 'specialist' && !useAuthStore.getState().isMasquerading) {
    return (
      <PainelDoEspecialista
        isLoading={isLoading}
        onRefresh={loadData}
        profile={profile}
        students={students}
        workouts={workouts}
      />
    );
  }

  // Student Dashboard (Gamified)
  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadData}
            tintColor={brandColors.primary.start}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="flex-row justify-between items-start mb-8 mt-2"
        >
          <View className="flex-1">
            <Text className="text-zinc-400 text-[15px] font-medium mb-1 font-sans tracking-wide uppercase">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text className="text-white text-[34px] font-bold font-display tracking-tight leading-tight">
              Olá, {profile?.full_name?.split(' ')[0] || 'Aluno'}
            </Text>
          </View>

          <View className="flex-row items-center gap-4">
            <View className="items-end gap-1.5">
              {streak?.freeze_available && streak.freeze_available > 0 && (
                <View className="bg-blue-500/20 px-2 py-0.5 rounded-full">
                  <Ionicons name="snow" size={10} color="#3B82F6" />
                </View>
              )}
              <StreakCounter
                streak={streak?.current_streak || 0}
                frozen={streak?.last_freeze_date === new Date().toISOString().split('T')[0]}
              />
            </View>

            <AvatarDoCabecalho profile={profile} />
          </View>
        </Animated.View>

        {/* Daily Progress Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="mb-8">
          <Text className="text-zinc-500 text-[13px] font-bold mb-3 font-sans uppercase tracking-widest ml-1">
            Minha Jornada
          </Text>

          {/* Workout of the Day (Bento Lead) */}
          {suggestedWorkout && (
            <PremiumCard
              title={suggestedWorkout.title}
              subtitle={`${suggestedWorkout.muscle_group || 'Geral'} • Meta de Hoje`}
              image={MUSCLE_IMAGES[suggestedWorkout.muscle_group || 'Geral']}
              onPress={() => router.push(ROUTES.WORKOUTS.DETAILS(suggestedWorkout.id))}
              containerStyle={{ marginBottom: 16 }}
              badge={
                <View className="bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/20">
                  <Text className="text-orange-500 text-[10px] font-black uppercase tracking-widest">
                    TREINO DO DIA
                  </Text>
                </View>
              }
            >
              <View className="flex-row items-center mt-4 bg-black/40 self-start px-3 py-2 rounded-xl border border-white/5">
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={brandColors.secondary.main}
                  style={{ marginRight: 6 }}
                />
                <Text className="text-white/90 text-[10px] font-bold uppercase tracking-widest">
                  {suggestedWorkout.duration_minutes || 60} MIN
                </Text>
                <View className="w-[1px] h-3 bg-white/20 mx-3" />
                <Ionicons
                  name="play"
                  size={12}
                  color={brandColors.primary.start}
                  style={{ marginRight: 6 }}
                />
                <Text className="text-white/90 text-[10px] font-bold uppercase tracking-widest">
                  Começar
                </Text>
              </View>
            </PremiumCard>
          )}

          <View className="gap-y-3">
            <ProgressCard
              title="Dieta & Macronutrientes"
              current={dailyGoal?.meals_completed || 0}
              target={dailyGoal?.meals_target || 4}
              icon="restaurant"
              color="success"
              unit="ref."
            />
            <ProgressCard
              title="Meta de Treino"
              current={dailyGoal?.workout_completed || 0}
              target={dailyGoal?.workout_target || 1}
              icon="barbell"
              color="warning"
              unit="treino"
            />
          </View>
        </Animated.View>

        {/* Weekly Consistency */}
        <Animated.View entering={FadeInDown.delay(250).springify()} className="mb-8">
          <WeeklyProgress weeklyGoals={weeklyGoals} />

          <CartaoDeEntrada
            cor="#3B82F6"
            icone="speedometer"
            legenda="Correr, Pedalar, Caminhar"
            onPress={() => router.push(ROUTES.TABS.CARDIO)}
            titulo="Sessão de Cardio"
          />

          <CartaoDeEntrada
            cor="#EAB308"
            icone="trophy"
            legenda="Sua posição entre os alunos"
            onPress={() => router.push(ROUTES.TABS.RANKING)}
            titulo="Ranking de Elite"
          />

          <CartaoDeEntrada
            cor={brandColors.primary.start}
            icone="scan"
            legenda="Escaneamento Corporal"
            onPress={() => router.push(ROUTES.ASSESSMENT.BODY_SCAN)}
            titulo="Avaliação IA"
          />

          {/* A anamnese sinaliza três estados pela cor: concluída, começada e
              nem começada. É a única entrada da Home em que o estado é a
              informação principal, e por isso a legenda dela é colorida. */}
          <CartaoDeEntrada
            cor={anamnese.cor}
            corDaLegenda={anamnese.cor}
            icone={anamnese.icone}
            legenda={anamnese.legenda}
            onPress={() => router.push(ROUTES.ASSESSMENT.ANAMNESIS)}
            titulo="Anamnese"
          />

          {/* Análise de Técnica (issue #194, fase 3).
              Só vira caminho aqui: até este cartão existir, nenhum aluno
              alcançava a tela. Quem barra a câmera é o consentimento próprio
              da finalidade, não a ausência de rota. */}
          <CartaoDeEntrada
            cor="#34d399"
            icone="body"
            legenda="Agachamento — conta e julga a profundidade"
            onPress={() => router.push(ROUTES.TECHNIQUE.ROOT)}
            titulo="Análise de Técnica"
          />

          {/* Health Connect.
              Sempre visível, como os cartões vizinhos: é o caminho para rever
              ou revogar a autorização, não só para concedê-la. Esconder depois
              de conectado tirava do aluno a única porta de volta. A legenda
              carrega o estado. */}
          <CartaoDeEntrada
            cor="#10b981"
            icone="heart-circle-outline"
            legenda={
              healthSource === 'device'
                ? 'Sono, FC de repouso, passos e calorias'
                : healthSource === 'mock'
                  ? 'Dados simulados — toque para conectar'
                  : 'Conecte o relógio para ver'
            }
            /*
              Há dado para mostrar, o cartão leva ao dado; não há, leva à
              permissão. Mandar quem já autorizou de volta ao onboarding era
              pedir de novo o que ele já deu.

              `mock` conta como "há dado" de propósito: ele existe para a tela
              funcionar sem aparelho, e tratá-lo como desconectado deixava a
              tela inalcançável no emulador — que é onde ela é aberta primeiro.
              O badge "Simulado" no topo dela diz de onde vem o número.
            */
            onPress={() =>
              router.push(
                healthSource === 'unavailable'
                  ? ROUTES.ONBOARDING.HEALTH_CONNECT
                  : ROUTES.STUDENT.HEALTH
              )
            }
            titulo={healthSource === 'device' ? 'Saúde do dia' : 'Conectar Saúde'}
          />
        </Animated.View>

        {/* Health Data (Bento Activity) */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="mb-8">
          <View className="flex-row justify-between items-center mb-4 ml-1">
            <Text className="text-zinc-500 text-[13px] font-bold font-sans uppercase tracking-widest">
              Atividade & Saúde
            </Text>
            {healthSource === 'device' && (
              <View className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10">
                <Text className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  Live
                </Text>
              </View>
            )}
            {healthSource === 'mock' && (
              <View className="bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/10">
                <Text className="text-amber-500 text-[10px] font-black uppercase tracking-widest">
                  Simulado
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row gap-x-4">
            <View className="flex-1">
              <StatCard
                label="Passos"
                value={steps.toLocaleString()}
                trend={steps >= 10000 ? 'up' : 'neutral'}
                change={steps >= 10000 ? 'Meta!' : `${Math.round((steps / 10000) * 100)}%`}
                icon="walk"
              />
            </View>
            <View className="flex-1">
              <StatCard
                label="Calorias"
                value={`${calories}`}
                trend="up"
                change="Kcal"
                icon="flame"
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Confetti Overlay */}
      <ConfettiOverlay show={showConfetti} />
    </ScreenLayout>
  );
}
