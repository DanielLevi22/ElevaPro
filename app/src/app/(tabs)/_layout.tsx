import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { TabBar } from '@/components/navigation/TabBar';
import { comOpacidade, useCores, useEscala } from '@/shared/design';

export default function TabLayout() {
  const { accountType, abilities, isMasquerading } = useAuthStore();
  const router = useRouter();
  const exitStudentView = () => {
    useAuthStore.getState().exitStudentView();
    router.push('/(tabs)/students');
  };

  // LOG DEBUG
  // console.log('Tabs Layout Render:', { accountType, isMasquerading, hasAbilities: !!abilities });

  // If accountType is null (loading), default to student to avoid flashing restricted tabs.
  // explicitly include isMasquerading to ensure tabs show immediately
  const isStudent =
    !accountType || accountType === 'student' || accountType === 'member' || isMasquerading;

  return (
    <>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // We handle styling in the custom component
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />

        <Tabs.Screen
          name="workouts"
          options={{
            title: 'Treino',
            href: isStudent || abilities?.can('manage', 'Workout') ? '/workouts' : null,
          }}
        />

        {/* Central Button usually, or just 3rd item */}
        <Tabs.Screen
          name="nutrition"
          options={{
            title: 'Nutrição',
            href:
              isStudent || (accountType === 'specialist' && abilities?.can('manage', 'Diet'))
                ? '/nutrition'
                : null,
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progresso',
            href: isStudent ? '/progress' : null,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            href: '/profile', // Always visible
          }}
        />

        {/* Previously Visible Tabs now Hidden from bar but accessible if needed (or we remove them) */}
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            href: null, // Hide from tab bar, accessed via other means if needed
          }}
        />

        <Tabs.Screen
          name="ranking"
          options={{
            title: 'Ranking',
            href: '/ranking',
          }}
        />

        <Tabs.Screen
          name="cardio/index"
          options={{
            title: 'Cardio',
            href: null, // Hide from main tabs, maybe access from Home
          }}
        />

        {/* A saúde abre pela tela inicial e pelo perfil, não por aba própria. */}
        <Tabs.Screen name="saude" options={{ title: 'Saúde', href: null }} />

        {/* Personal Trainer only */}
        <Tabs.Screen
          name="students"
          options={{
            title: 'Alunos',
            href:
              accountType === 'specialist' && abilities?.can('manage', 'Workout')
                ? '/students'
                : null,
          }}
        />
      </Tabs>

      {/* Visão do aluno: o botão flutuante de volta ao painel do especialista. */}
      {isStudent && isMasquerading && <ExitStudentViewButton onExit={exitStudentView} />}
    </>
  );
}

const EXIT_ICON = 20;

/**
 * Sair da visão do aluno. Fica acima da tab bar flutuante, na cor destrutiva: é o
 * que devolve o especialista ao próprio painel, e não pode sumir no meio da tela do
 * aluno.
 */
function ExitStudentViewButton({ onExit }: { onExit: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="absolute bottom-[7.5rem] right-5 z-50">
      <TouchableOpacity
        onPress={onExit}
        accessibilityRole="button"
        className="flex-row items-center gap-2 rounded-full bg-destructive px-5 py-3"
        style={{
          boxShadow: [
            {
              offsetX: 0,
              offsetY: escalar(4),
              blurRadius: escalar(10),
              color: comOpacidade(cores.sombra, 0.3),
            },
          ],
        }}
      >
        <MaterialCommunityIcons
          name="eye-off"
          size={escalar(EXIT_ICON)}
          color={cores.destructiveForeground}
        />
        <Text className="font-bold text-destructive-foreground">Sair da Visão do Aluno</Text>
      </TouchableOpacity>
    </View>
  );
}
