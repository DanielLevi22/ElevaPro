import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { Row } from '@/components/ui/Row';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

const UM_DIA_MS = 24 * 60 * 60 * 1000;

function dataIso(data: Date): string {
  return data.toISOString().split('T')[0];
}

/**
 * Passo 1 do wizard de criação de treino: ponto de partida (chat com a IA,
 * do zero ou modelo) e o esqueleto da periodização — nome, duração,
 * frequência, divisão.
 *
 * "Sugestão da IA" leva direto pro chat de verdade (`WorkoutAssistantScreen`)
 * — a mesma conversa que já persiste no web — em vez de uma proposta de um
 * tiro só. Ao concluir manualmente, grava a periodização e a primeira fase
 * (`workoutsService`) e segue para o passo 2 com `periodizationId`/`phaseId`
 * já resolvidos.
 */
export default function WorkoutWizardStructureScreen() {
  const router = useRouter();
  const { studentId, studentName } = useLocalSearchParams<{
    studentId: string;
    studentName?: string;
  }>();
  const wizard = useWorkoutWizardStore();
  const { createPeriodization, createTrainingPlan } = useWorkoutStore();
  const specialistId = useAuthStore((s) => s.user?.id ?? null);

  const [saving, setSaving] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reiniciar o rascunho é só sobre trocar de aluno, não sobre o nome dele mudar
  useEffect(() => {
    if (studentId) wizard.startFor(studentId, studentName ?? 'Aluno');
  }, [studentId]);

  function goToAssistant() {
    router.push({ pathname: ROUTES.WORKOUTS.WIZARD_ASSISTANT, params: { studentId } });
  }

  async function saveManualStructure() {
    if (!wizard.planName.trim()) {
      showAlert({
        title: 'Nome obrigatório',
        message: 'Dê um nome ao plano antes de continuar.',
        type: 'error',
      });
      return;
    }
    if (!studentId || !specialistId) return;

    setSaving(true);
    try {
      const inicio = new Date();
      const fim = new Date(inicio.getTime() + wizard.durationWeeks * 7 * UM_DIA_MS);
      const periodizacao = await createPeriodization({
        specialist_id: specialistId,
        student_id: studentId,
        name: wizard.planName,
        objective: wizard.objective || null,
        status: 'planned',
        start_date: dataIso(inicio),
        end_date: dataIso(fim),
      });
      const fase = await createTrainingPlan({
        periodization_id: periodizacao.id,
        name: wizard.planName,
        status: 'planned',
        start_date: dataIso(inicio),
        end_date: dataIso(fim),
        order_index: 0,
      });

      wizard.setCreatedStructure(periodizacao.id, fase.id);
      router.push({ pathname: ROUTES.WORKOUTS.WIZARD_BUILD, params: { studentId } });
    } catch {
      showAlert({
        title: 'Erro',
        message: 'Não foi possível criar a estrutura do treino.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        <BotaoFixoNoRodape
          rotulo={saving ? 'Aguarde…' : 'Continuar'}
          icone="arrow-forward"
          onPress={saveManualStructure}
        />
      }
    >
      <View className="flex-row justify-between pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>

      <ProgressHeader
        size="page"
        eyebrow={`${wizard.studentName ?? 'Aluno'} · novo plano`}
        title="Estrutura do treino"
      />

      <View className="mt-3">
        <Text className="mb-1.5 text-[0.65625rem] font-bold uppercase tracking-widest text-placeholder">
          1 de 3
        </Text>
        <BarraDeProgresso percentual={33} espessura="fina" />
      </View>

      <TituloDeSecao estilo="rotulo">Ponto de partida</TituloDeSecao>
      <Group>
        <Row
          icon="sparkles"
          title="Sugestão da IA"
          sub="Conversa com o assistente para montar a periodização"
          chevron
          onPress={goToAssistant}
        />
        <Row icon="create-outline" title="Do zero" sub="Montar exercício por exercício" selected />
        <Row
          icon="bookmark-outline"
          title="Meu modelo"
          sub="Em breve"
          onPress={() =>
            showAlert({
              title: 'Em breve',
              message: 'Salvar e reaproveitar modelos ainda não está disponível.',
              type: 'info',
            })
          }
        />
      </Group>

      <TituloDeSecao estilo="rotulo">Detalhes do plano</TituloDeSecao>
      <Group>
        <Input
          icon="clipboard-outline"
          placeholder="Nome do plano"
          value={wizard.planName}
          onChangeText={wizard.setPlanName}
        />
        <Input
          icon="flag-outline"
          placeholder="Objetivo (ex.: Hipertrofia)"
          value={wizard.objective}
          onChangeText={wizard.setObjective}
        />
        <Input
          icon="calendar-outline"
          placeholder="Duração (semanas)"
          keyboardType="number-pad"
          value={String(wizard.durationWeeks)}
          onChangeText={(texto) => wizard.setDurationWeeks(Number(texto) || 0)}
        />
        <Input
          icon="repeat-outline"
          placeholder="Frequência (x/semana)"
          keyboardType="number-pad"
          value={String(wizard.frequencyPerWeek)}
          onChangeText={(texto) => wizard.setFrequencyPerWeek(Number(texto) || 0)}
        />
        <Input
          icon="grid-outline"
          placeholder="Divisão (ex.: Upper/Lower)"
          value={wizard.split}
          onChangeText={wizard.setSplit}
        />
      </Group>
    </GlassScreen>
  );
}
