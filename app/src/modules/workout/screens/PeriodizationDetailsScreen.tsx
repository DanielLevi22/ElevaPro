import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Row';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { fotoDoObjetivo } from '@/shared/imagens/fotosDeTreino';
import { EstadoDaTela } from '../components/aluno/EstadoDaTela';
import { PhaseTimelineCard } from '../components/PhaseTimelineCard';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

const OBJETIVOS: Record<string, string> = {
  strength: 'Força',
  hypertrophy: 'Hipertrofia',
  adaptation: 'Adaptação',
};

function dataCurta(data: string | null): string {
  if (!data) return '—';
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * A periodização, na visão de quem gerencia — lista as fases e ativa/encerra
 * o plano. Substitui o cabeçalho de foto solto por `TelaDeVidroComFoto`, o
 * mesmo casco das telas do aluno (#335).
 */
export default function PeriodizationDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user, accountType } = useAuthStore();
  const rawMode = params.mode;
  const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  // `/students/[id]/...` é navegação exclusiva do especialista olhando a ficha
  // de um aluno — não é o aluno vendo o próprio treino. Contar o pathname aqui
  // fazia o especialista, ao entrar por essa ficha, cair na versão só-leitura
  // desta tela, que devia ser exclusiva de quem é de fato aluno/membro em execução.
  const isStudentView =
    accountType === 'student' || (accountType === 'member' && mode === 'execute');
  const {
    periodizations,
    fetchPeriodizations,
    activatePeriodization,
    updatePeriodization,
    currentPeriodizationPhases,
    fetchPeriodizationPhases,
    createTrainingPlan,
    isLoading,
  } = useWorkoutStore();
  const wizard = useWorkoutWizardStore();

  const rawPeriodizationId = params.periodizationId || params.id;
  const periodizationId = Array.isArray(rawPeriodizationId)
    ? rawPeriodizationId[0]
    : rawPeriodizationId;
  const periodization = periodizations.find((p) => p.id === periodizationId) ?? null;

  useEffect(() => {
    if (user?.id && !periodization) fetchPeriodizations(user.id);
  }, [user?.id, periodization, fetchPeriodizations]);

  useEffect(() => {
    if (periodizationId) fetchPeriodizationPhases(periodizationId);
  }, [periodizationId, fetchPeriodizationPhases]);

  function ativar() {
    if (!periodization) return;
    showConfirm({
      title: 'Ativar periodização',
      message: 'Outras periodizações ativas deste aluno serão concluídas. Continuar?',
      type: 'warning',
      confirmText: 'Ativar',
      onConfirm: async () => {
        try {
          await activatePeriodization(periodization.id);
        } catch {
          showAlert({
            title: 'Erro',
            message: 'Não foi possível ativar a periodização.',
            type: 'error',
          });
        }
      },
    });
  }

  function encerrar() {
    if (!periodization) return;
    showConfirm({
      title: 'Encerrar periodização',
      message: 'Esta ação não pode ser desfeita. Continuar?',
      type: 'danger',
      confirmText: 'Encerrar',
      onConfirm: async () => {
        try {
          await updatePeriodization(periodization.id, { status: 'completed' });
        } catch {
          showAlert({
            title: 'Erro',
            message: 'Não foi possível encerrar a periodização.',
            type: 'error',
          });
        }
      },
    });
  }

  function adicionarFase() {
    if (!periodization) return;
    showConfirm({
      title: 'Nova fase',
      message: 'Criar uma nova fase de treino?',
      type: 'info',
      confirmText: 'Criar',
      onConfirm: async () => {
        try {
          const novaFase = await createTrainingPlan({
            periodization_id: periodization.id,
            name: `Fase ${currentPeriodizationPhases.length + 1}`,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'planned',
            order_index: currentPeriodizationPhases.length,
          });
          // A fase nasce vazia — segue direto pro passo de montagem do
          // wizard (#335) em vez de "Fase criada!" sem exercício nenhum.
          wizard.startFor(periodization.student_id, periodization.student?.full_name ?? 'Aluno');
          wizard.setPlanName(novaFase.name);
          wizard.setCreatedStructure(periodization.id, novaFase.id);
          router.push({
            pathname: ROUTES.WORKOUTS.WIZARD_BUILD,
            params: { studentId: periodization.student_id },
          });
        } catch {
          showAlert({ title: 'Erro', message: 'Não foi possível criar a fase.', type: 'error' });
        }
      },
    });
  }

  function abrirFase(faseId: string) {
    const targetStudentId = params.id || periodization?.student_id;
    if (params.id && params.periodizationId) {
      router.push(
        `/(tabs)/students/${targetStudentId}/workouts/${periodizationId}/phases/${faseId}` as never
      );
      return;
    }
    router.push({
      pathname: `/(tabs)/workouts/periodizations/${periodizationId}/phases/${faseId}` as never,
      params: mode === 'execute' ? { mode: 'execute' } : {},
    });
  }

  if (!periodization) {
    return <EstadoDaTela naoEncontrado={!isLoading} mensagem="Periodização não encontrada." />;
  }

  const fasesVisiveis = currentPeriodizationPhases.filter(
    (fase) => !isStudentView || fase.status === 'active' || fase.status === 'planned'
  );

  return (
    <TelaDeVidroComFoto image={fotoDoObjetivo(periodization.objective)}>
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        {!isStudentView ? (
          <BotaoRedondo
            icone="pencil"
            rotulo="Editar"
            onPress={() =>
              showAlert({ title: 'Em breve', message: 'Edição em desenvolvimento', type: 'info' })
            }
          />
        ) : null}
      </View>

      <View className="mt-[3.625rem]">
        <View className="mb-2.5 flex-row items-center gap-1.5">
          <Chip>{OBJETIVOS[periodization.objective ?? ''] ?? 'Planejamento'}</Chip>
          <StatusBadge status={periodization.status} />
        </View>
        <Text className="text-[1.875rem] font-bold leading-tight tracking-tight text-hero">
          {periodization.name}
        </Text>
        <Text className="mt-[0.4375rem] text-[0.84375rem] leading-snug text-hero-secondary">
          {(periodization as unknown as { description?: string }).description ||
            'Transforme seu corpo com este planejamento exclusivo.'}
        </Text>
        <View className="mt-3 flex-row gap-1.5">
          <Chip icone="calendar-outline">{dataCurta(periodization.start_date)}</Chip>
          <Chip icone="flag-outline">{dataCurta(periodization.end_date)}</Chip>
        </View>
      </View>

      {!isStudentView && periodization.status === 'planned' ? (
        <View className="mt-4">
          <BotaoDeDestaque rotulo="Ativar periodização" icone="play" onPress={ativar} />
        </View>
      ) : null}
      {!isStudentView && periodization.status === 'active' ? (
        <View className="mt-4">
          <BotaoDeDestaque
            rotulo="Encerrar periodização"
            icone="stop"
            tom="perigo"
            onPress={encerrar}
          />
        </View>
      ) : null}

      <TituloDeSecao estilo="rotulo">Fases do treinamento</TituloDeSecao>
      {fasesVisiveis.map((fase, index) => (
        <PhaseTimelineCard
          key={fase.id}
          phase={fase}
          index={index}
          isLast={index === fasesVisiveis.length - 1}
          onPress={() => abrirFase(fase.id)}
        />
      ))}

      {!isStudentView ? (
        <Row icon="add-circle-outline" title="Adicionar fase" chevron onPress={adicionarFase} />
      ) : null}
    </TelaDeVidroComFoto>
  );
}
