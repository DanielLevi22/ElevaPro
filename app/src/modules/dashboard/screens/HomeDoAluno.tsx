import { useRouter } from 'expo-router';
import { type ImageSourcePropType, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ConfettiOverlay } from '@/components/gamification/ConfettiOverlay';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { WeeklyProgress } from '@/components/gamification/WeeklyProgress';
import { Anel } from '@/components/ui/Anel';
import { AvatarDoCabecalho } from '@/components/ui/AvatarDoCabecalho';
import { BlocoDeMetrica } from '@/components/ui/BlocoDeMetrica';
import { FundoDeFoto, RECEITA_DA_HOME } from '@/components/ui/FundoDeFoto';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { CartaoDoTreinoDoDia } from '../components/CartaoDoTreinoDoDia';
import { EntradasDeHoje } from '../components/EntradasDeHoje';
import type { useDadosDaHome } from '../hooks/useDadosDaHome';
import { faltaParaFecharODia } from '../services/faltaParaFecharODia';

/**
 * A entrada do aluno, no desenho de vidro do kit.
 *
 * **As entradas não são só as quatro do desenho.** O kit desenha dieta, cardio,
 * avaliação e ranking; o app tem também anamnese, análise de técnica e saúde, e
 * cada uma é o único caminho para a sua tela. A de saúde é ainda o caminho para
 * **rever ou revogar** a autorização de dado de saúde — derrubá-la tiraria do
 * aluno a porta de volta. O desenho é de um estado anterior do produto;
 * acrescentar linhas no estilo dele é recombinação, não invenção.
 */
type Dados = ReturnType<typeof useDadosDaHome>;

const FOTO_POR_GRUPO: Record<string, ImageSourcePropType> = {
  Peito: require('../../../../assets/workouts/chest.jpg'),
  Costas: require('../../../../assets/workouts/back.jpg'),
  Pernas: require('../../../../assets/workouts/legs.jpg'),
  Braços: require('../../../../assets/workouts/arms.jpg'),
  Ombros: require('../../../../assets/workouts/shoulders.jpg'),
  Abs: require('../../../../assets/workouts/abs.jpg'),
  Geral: require('../../../../assets/workouts/chest.jpg'),
};

const META_DE_PASSOS = 10000;
const MINUTOS_POR_HORA = 60;

export function HomeDoAluno({ dados }: { dados: Dados }) {
  const router = useRouter();
  const cores = useCores();
  const { perfil, treinoSugerido, saude, gamificacao, carregando, recarregar } = dados;
  const { dailyGoal, weeklyGoals, streak, showConfetti } = gamificacao;

  const grupo = treinoSugerido?.muscle_group || 'Geral';

  return (
    <ScreenLayout useSafeArea={false}>
      <ScrollView
        contentContainerClassName="px-4 pb-28 pt-14"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={recarregar}
            tintColor={cores.primary}
          />
        }
      >
        <FundoDeFoto imagem={FOTO_POR_GRUPO[grupo]} receita={RECEITA_DA_HOME} />

        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1">
            <Text className="text-legenda font-semibold text-hero-secondary">{hoje()}</Text>
            <Text className="mt-0.5 text-h1 font-bold tracking-tight text-hero">
              Olá, {perfil?.full_name?.split(' ')[0] || 'Aluno'}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <StreakCounter
              streak={streak?.current_streak || 0}
              frozen={streak?.last_freeze_date === hojeISO()}
            />
            <AvatarDoCabecalho profile={perfil} />
          </View>
        </View>

        <View className="mt-6 items-center">
          <Anel
            valor={dailyGoal?.completion_percentage ?? 0}
            meta={100}
            rotulo={`${Math.round(dailyGoal?.completion_percentage ?? 0)}%`}
            sub="Meta do dia"
          />
        </View>
        <Text className="mb-5 mt-2.5 text-center text-legenda text-hero-secondary">
          {faltaParaFecharODia(dailyGoal)}
        </Text>

        <View className="flex-row gap-2.5">
          <BlocoDeMetrica
            icon="footsteps"
            tom="passos"
            valor={saude.steps.toLocaleString('pt-BR')}
            unidade="passos"
            legenda={`${Math.round((saude.steps / META_DE_PASSOS) * 100)}% da meta`}
          />
          <BlocoDeMetrica
            icon="flame"
            tom="calorias"
            valor={`${saude.calories}`}
            unidade="kcal"
            legenda="Queimadas hoje"
          />
          <BlocoDeMetrica
            icon="moon"
            tom="sono"
            valor={emHoras(saude.sleepMinutes)}
            legenda="Sono"
          />
        </View>

        {treinoSugerido ? (
          <>
            <TituloDeSecao acao="Ver tudo" onAcao={() => router.push(ROUTES.TABS.WORKOUTS)}>
              Treino do dia
            </TituloDeSecao>
            <CartaoDoTreinoDoDia
              titulo={treinoSugerido.title}
              etiqueta={grupo}
              imagem={FOTO_POR_GRUPO[grupo]}
              minutos={treinoSugerido.duration_minutes}
              onPress={() => router.push(ROUTES.WORKOUTS.DETAILS(treinoSugerido.id))}
            />
          </>
        ) : null}

        <TituloDeSecao>Hoje</TituloDeSecao>
        <EntradasDeHoje dados={dados} />

        <TituloDeSecao>Minha semana</TituloDeSecao>
        <WeeklyProgress weeklyGoals={weeklyGoals} />
      </ScrollView>

      <ConfettiOverlay show={showConfetti} />
    </ScreenLayout>
  );
}

/** Sono vem em minutos; "7h20" é como a pessoa fala, e "440" não é. */
function emHoras(minutos: number | null): string {
  if (!minutos) return '—';
  const horas = Math.floor(minutos / MINUTOS_POR_HORA);
  const resto = String(minutos % MINUTOS_POR_HORA).padStart(2, '0');
  return `${horas}h${resto}`;
}

function hoje(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function hojeISO(): string {
  return new Date().toISOString().split('T')[0];
}
