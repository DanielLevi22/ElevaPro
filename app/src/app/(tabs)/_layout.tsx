import { Tabs } from 'expo-router';
import { useAuthStore } from '@/auth';
import { TabBar } from '@/components/navigation/TabBar';

export default function TabLayout() {
  const { accountType } = useAuthStore();

  // If accountType is null (loading), default to student to avoid flashing restricted tabs.
  const isStudent = !accountType || accountType === 'student' || accountType === 'member';

  return (
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
  );
}
