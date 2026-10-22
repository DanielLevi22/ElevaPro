import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { TabBar } from '@/components/navigation/TabBar';
import { comOpacidade, useBottomOffset, useCores, useEscala } from '@/shared/design';

export default function TabLayout() {
  const { accountType, isMasquerading } = useAuthStore();
  const router = useRouter();
  const exitStudentView = () => {
    useAuthStore.getState().exitStudentView();
    router.push('/(tabs)/students');
  };

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
          // O especialista volta a uma aba pela lista: cada aba guardava a pilha, e
          // ele reabria no detalhe do aluno, na fase ou no plano de outro (#437).
          // O aluno não: a sessão de treino mora na pilha de Treinos e segura a
          // saída, e trocar de aba no meio dela não pode derrubá-la.
          popToTopOnBlur: !isStudent,
        }}
      >
        {/* Toda tela declarada e sem `href`: no expo-router 58, `href: null` vira aba
            escondida, e aba escondida não pode ter foco — navegar até ela volta para a
            inicial. Quem decide o que aparece na barra, por papel, é a `TabBar`. */}
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="workouts" options={{ title: 'Treino' }} />
        <Tabs.Screen name="nutrition" options={{ title: 'Nutrição' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progresso' }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
        <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
        <Tabs.Screen name="security" options={{ title: 'Aparelhos de acesso' }} />
        <Tabs.Screen name="ranking" options={{ title: 'Ranking' }} />
        <Tabs.Screen name="cardio/index" options={{ title: 'Cardio' }} />
        {/* A saúde abre pela tela inicial e pelo perfil, não por aba própria. */}
        <Tabs.Screen name="saude" options={{ title: 'Saúde' }} />
        <Tabs.Screen name="students" options={{ title: 'Alunos' }} />
      </Tabs>

      {/* Visão do aluno: o botão flutuante de volta ao painel do especialista. */}
      {isStudent && isMasquerading && <ExitStudentViewButton onExit={exitStudentView} />}
    </>
  );
}

const EXIT_ICON = 20;
/** Do fundo da tela, acima da tab bar e do "+" central. */
const EXIT_FROM_BOTTOM = 120;

/**
 * Sair da visão do aluno. Fica acima da tab bar flutuante, na cor destrutiva: é o
 * que devolve o especialista ao próprio painel, e não pode sumir no meio da tela do
 * aluno.
 */
function ExitStudentViewButton({ onExit }: { onExit: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const bottom = useBottomOffset(EXIT_FROM_BOTTOM);
  return (
    <View className="absolute right-5 z-50" style={{ bottom }}>
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
