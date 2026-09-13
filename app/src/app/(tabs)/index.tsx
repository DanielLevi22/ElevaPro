import { Text } from 'react-native';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { PainelDoEspecialista } from '@/modules/dashboard/components/PainelDoEspecialista';
import { useDadosDaHome } from '@/modules/dashboard/hooks/useDadosDaHome';
import { HomeDoAluno } from '@/modules/dashboard/screens/HomeDoAluno';

/**
 * A entrada do app, e só a escolha de qual delas.
 *
 * Eram 410 linhas com duas telas dentro. Agora os dados vêm de
 * `useDadosDaHome`, e cada papel tem a sua tela: o painel do especialista e a
 * home do aluno não compartilham nada além do arquivo em que moravam.
 */
export default function TelaInicial() {
  const dados = useDadosDaHome();
  const { accountType, isMasquerading } = useAuthStore();

  if (dados.carregando && !dados.perfil && !accountType) {
    return (
      <ScreenLayout className="items-center justify-center">
        <Text className="text-corpo font-semibold text-muted-foreground">Carregando…</Text>
      </ScreenLayout>
    );
  }

  if (accountType === 'specialist' && !isMasquerading) {
    return (
      <PainelDoEspecialista
        isLoading={dados.carregando}
        onRefresh={dados.recarregar}
        profile={dados.perfil}
        students={dados.students}
        workouts={dados.workouts}
      />
    );
  }

  return <HomeDoAluno dados={dados} />;
}
