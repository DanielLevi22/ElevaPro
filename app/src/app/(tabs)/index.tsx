import { Text } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useDadosDaHome } from '@/hooks/useDadosDaHome';
import { HomeDoAluno, SpecialistDashboard } from '@/modules/dashboard';

/**
 * A entrada do app, e só a escolha de qual delas.
 *
 * Os dados vêm de `useDadosDaHome`, que junta cada módulo; cada papel tem a sua
 * tela e recebe o seu recorte. O painel do especialista e a home do aluno não
 * compartilham nada além do arquivo em que moravam.
 */
export default function TelaInicial() {
  const { accountType, isMasquerading, aluno, especialista } = useDadosDaHome();

  if (aluno.carregando && !aluno.perfil && !accountType) {
    return (
      <ScreenLayout className="items-center justify-center">
        <Text className="text-corpo font-semibold text-muted-foreground">Carregando…</Text>
      </ScreenLayout>
    );
  }

  if (accountType === 'specialist' && !isMasquerading) {
    return (
      <SpecialistDashboard
        isLoading={especialista.carregando}
        onRefresh={especialista.recarregar}
        profile={especialista.perfil}
        students={especialista.alunos}
        briefing={especialista.briefing}
        averageAdherence={especialista.averageAdherence}
      />
    );
  }

  return <HomeDoAluno dados={aluno} />;
}
