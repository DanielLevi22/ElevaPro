import { addDays, localDateOf, localNoonOf, periodizationObjectiveLabel } from '@elevapro/shared';
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

/** Quanto dura a fase recém-criada, como no web. */
const NEW_PHASE_DAYS = 30;

function shortDate(date: string | null): string {
  if (!date) return '—';
  return localNoonOf(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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

  function activate() {
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

  function complete() {
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

  /** Como o "Nova Fase" do web: grava na hora e a fase aparece na lista. */
  async function addPhase() {
    if (!periodization) return;
    const today = localDateOf(new Date());
    try {
      await createTrainingPlan({
        periodization_id: periodization.id,
        name: `Fase ${currentPeriodizationPhases.length + 1}`,
        start_date: today,
        end_date: addDays(today, NEW_PHASE_DAYS),
        status: 'planned',
        order_index: currentPeriodizationPhases.length,
      });
    } catch {
      showAlert({ title: 'Erro', message: 'Não foi possível criar a fase.', type: 'error' });
    }
  }

  function openPhase(phaseId: string) {
    if (!periodizationId) return;
    // Pela pilha de Alunos, `id` é o aluno e `periodizationId` vem à parte.
    const studentId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (studentId && params.periodizationId) {
      router.push(ROUTES.STUDENTS.PHASE(studentId, periodizationId, phaseId));
      return;
    }
    router.push(
      mode === 'execute'
        ? ROUTES.WORKOUTS.PHASE_EXECUTE(periodizationId, phaseId)
        : ROUTES.WORKOUTS.PHASE(periodizationId, phaseId)
    );
  }

  if (!periodization) {
    return <EstadoDaTela naoEncontrado={!isLoading} mensagem="Periodização não encontrada." />;
  }

  const visiblePhases = currentPeriodizationPhases.filter(
    (phase) => !isStudentView || phase.status === 'active' || phase.status === 'planned'
  );

  return (
    <TelaDeVidroComFoto image={fotoDoObjetivo(periodization.objective)}>
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        {!isStudentView ? (
          <BotaoRedondo
            icone="pencil"
            rotulo="Editar"
            onPress={() => router.push(ROUTES.WORKOUTS.PERIODIZATION_EDIT(periodization.id))}
          />
        ) : null}
      </View>

      <View className="mt-[3.625rem]">
        <View className="mb-2.5 flex-row items-center gap-1.5">
          <Chip>{periodizationObjectiveLabel(periodization.objective) ?? 'Planejamento'}</Chip>
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
          <Chip icone="calendar-outline">{shortDate(periodization.start_date)}</Chip>
          <Chip icone="flag-outline">{shortDate(periodization.end_date)}</Chip>
        </View>
      </View>

      {!isStudentView && periodization.status === 'planned' ? (
        <View className="mt-4">
          <BotaoDeDestaque rotulo="Ativar periodização" icone="play" onPress={activate} />
        </View>
      ) : null}
      {!isStudentView && periodization.status === 'active' ? (
        <View className="mt-4">
          <BotaoDeDestaque
            rotulo="Encerrar periodização"
            icone="stop"
            tom="perigo"
            onPress={complete}
          />
        </View>
      ) : null}

      <TituloDeSecao estilo="rotulo">Fases do treinamento</TituloDeSecao>
      {visiblePhases.map((phase, index) => (
        <PhaseTimelineCard
          key={phase.id}
          phase={phase}
          index={index}
          isLast={index === visiblePhases.length - 1}
          onPress={() => openPhase(phase.id)}
        />
      ))}

      {!isStudentView && visiblePhases.length === 0 ? <FirstPhaseHint /> : null}
      {!isStudentView ? (
        <Row icon="add-circle-outline" title="Nova fase" onPress={addPhase} />
      ) : null}
    </TelaDeVidroComFoto>
  );
}

/** O vazio do web: o que é uma fase, antes de criar a primeira. */
function FirstPhaseHint() {
  return (
    <View className="mb-3 items-center py-6">
      <Text className="text-[0.95rem] font-bold text-foreground">Adicione a primeira fase</Text>
      <Text className="mt-1 text-center text-[0.8125rem] text-muted-foreground">
        Uma fase é um bloco de treinos com foco específico.
      </Text>
      <Text className="mt-1 text-center text-legenda text-muted-foreground">
        Ex.: "Semanas 1–4 · Adaptação", "Semanas 5–8 · Força"
      </Text>
    </View>
  );
}
