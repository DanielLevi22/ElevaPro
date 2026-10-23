import { Text } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useDadosDaHome } from '@/hooks/useDadosDaHome';
import { BlockCard } from '@/modules/block';
import { CheckInCard, WeeklyReportCard } from '@/modules/checkin';
import { HomeDoAluno, SpecialistDashboard } from '@/modules/dashboard';
import { CompleteProfileCard } from '@/modules/onboarding';
import { TodayChecklistCard } from '@/shared/notices';

/**
 * A entrada do app, e só a escolha de qual delas.
 *
 * Os dados vêm de `useDadosDaHome`, que junta cada módulo; cada papel tem a sua
 * tela e recebe o seu recorte. O painel do especialista e a home do aluno não
 * compartilham nada além do arquivo em que moravam.
 */
export default function HomeTab() {
  const { accountType, aluno, especialista } = useDadosDaHome();

  if (aluno.carregando && !aluno.perfil && !accountType) {
    return (
      <ScreenLayout className="items-center justify-center">
        <Text className="text-corpo font-semibold text-muted-foreground">Carregando…</Text>
      </ScreenLayout>
    );
  }

  if (accountType === 'specialist') {
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

  // O check-in vem antes: é a ação da semana; o relatório da semana que
  // fechou vem logo depois; completar o perfil espera.
  return (
    <HomeDoAluno
      dados={aluno}
      aviso={
        <>
          <CheckInCard />
          <TodayChecklistCard studentId={aluno.perfil?.id ?? null} />
          <WeeklyReportCard />
          <BlockCard />
          <CompleteProfileCard />
        </>
      }
    />
  );
}
