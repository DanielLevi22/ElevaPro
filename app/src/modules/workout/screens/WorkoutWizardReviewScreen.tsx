import type { DayOfWeek } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Group } from '@/components/ui/Group';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { Row } from '@/components/ui/Row';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

const DIAS: readonly DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DIA_ABREVIADO: Record<DayOfWeek, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

/** Avança um dia por toque; do domingo volta para "sem dia". */
function proximoDia(atual: DayOfWeek | null): DayOfWeek | null {
  if (!atual) return DIAS[0];
  const indice = DIAS.indexOf(atual);
  return indice === DIAS.length - 1 ? null : DIAS[indice + 1];
}

/**
 * Passo 3 do wizard: resumo do plano, atribuição de dia por treino, e a
 * publicação — que ativa a periodização e a fase (`activatePeriodization`/
 * `activateTrainingPlan`), o que já existe e é o que a aderência do aluno lê.
 */
export default function WorkoutWizardReviewScreen() {
  const router = useRouter();
  const wizard = useWorkoutWizardStore();
  const {
    workouts,
    fetchWorkoutsForPhase,
    updateWorkout,
    activatePeriodization,
    activateTrainingPlan,
  } = useWorkoutStore();
  const [publishing, setPublishing] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: só a fase muda o que buscar; a função vem da store e é estável entre renders
  useEffect(() => {
    if (wizard.phaseId) fetchWorkoutsForPhase(wizard.phaseId);
  }, [wizard.phaseId]);

  async function cycleDay(workoutId: string, atual: DayOfWeek | null) {
    try {
      await updateWorkout(workoutId, { day_of_week: proximoDia(atual) });
    } catch {
      showAlert({ title: 'Erro', message: 'Não consegui atualizar o dia.', type: 'error' });
    }
  }

  async function publish() {
    if (!wizard.periodizationId || !wizard.phaseId) return;
    setPublishing(true);
    try {
      await activatePeriodization(wizard.periodizationId);
      await activateTrainingPlan(wizard.phaseId);
      showAlert({ title: 'Publicado', message: 'O plano já vale para o aluno.', type: 'success' });
      wizard.reset();
      router.push(ROUTES.WORKOUTS.ROOT);
    } catch {
      showAlert({ title: 'Erro', message: 'Não consegui publicar o plano.', type: 'error' });
    } finally {
      setPublishing(false);
    }
  }

  const totalExercicios = workouts.reduce((soma, w) => soma + (w.exercises?.length ?? 0), 0);

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        <BotaoFixoNoRodape
          rotulo={publishing ? 'Publicando…' : 'Publicar'}
          icone="checkmark"
          onPress={publish}
        />
      }
    >
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>

      <ProgressHeader
        size="page"
        eyebrow={wizard.studentName ?? 'Aluno'}
        title="Revisar e publicar"
      />

      <View className="mt-3">
        <Text className="mb-1.5 text-[0.65625rem] font-bold uppercase tracking-widest text-placeholder">
          3 de 3
        </Text>
        <BarraDeProgresso percentual={100} espessura="fina" />
      </View>

      <Vidro className="mt-4 p-4">
        <Text className="text-[1.1rem] font-bold text-foreground">{wizard.planName}</Text>
        <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
          {wizard.durationWeeks} semanas · {wizard.frequencyPerWeek}x/semana
          {wizard.split ? ` · ${wizard.split}` : ''}
        </Text>
        <View className="mt-3 flex-row gap-4">
          <EstatDoResumo rotulo="Treinos" valor={String(workouts.length)} />
          <EstatDoResumo rotulo="Exercícios" valor={String(totalExercicios)} />
        </View>
      </Vidro>

      <TituloDeSecao estilo="rotulo">Divisão semanal</TituloDeSecao>
      <Group>
        {workouts.map((w) => (
          <Row
            key={w.id}
            icon="calendar-outline"
            title={w.title}
            sub={w.day_of_week ? DIA_ABREVIADO[w.day_of_week] : 'Toque para definir o dia'}
            onPress={() => cycleDay(w.id, w.day_of_week ?? null)}
          />
        ))}
      </Group>
    </GlassScreen>
  );
}

function EstatDoResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[1.0625rem] font-extrabold text-primary-text">{valor}</Text>
      <Text className="text-[0.59375rem] font-bold uppercase tracking-wide text-placeholder">
        {rotulo}
      </Text>
    </View>
  );
}
