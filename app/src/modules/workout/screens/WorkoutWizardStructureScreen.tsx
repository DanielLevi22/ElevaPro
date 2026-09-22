import type { PeriodizationProposal } from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Card } from '@/components/ui/Card';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Group } from '@/components/ui/Group';
import { Input } from '@/components/ui/Input';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { Row } from '@/components/ui/Row';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { WorkoutChatService } from '../services/WorkoutChatService';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

type PontoDePartida = 'ai' | 'scratch' | 'template';

const UM_DIA_MS = 24 * 60 * 60 * 1000;

function dataIso(data: Date): string {
  return data.toISOString().split('T')[0];
}

function mensagemParaIa(wizard: {
  objective: string;
  durationWeeks: number;
  frequencyPerWeek: number;
  split: string;
}): string {
  const detalhes = [
    wizard.objective ? `com foco em ${wizard.objective}` : null,
    `duração de ${wizard.durationWeeks} semanas`,
    `frequência de ${wizard.frequencyPerWeek}x por semana`,
    wizard.split ? `divisão ${wizard.split}` : null,
  ].filter(Boolean);
  return `Monte uma periodização de treino ${detalhes.join(', ')}.`;
}

/**
 * Passo 1 do wizard de criação de treino: ponto de partida (IA, do zero ou
 * modelo) e o esqueleto da periodização — nome, duração, frequência, divisão.
 *
 * Ao concluir, grava a periodização e a primeira fase (`workoutsService`,
 * manual, ou `save-periodization` do chat de IA já existente no web) e segue
 * para o passo 2 com `periodizationId`/`phaseId` já resolvidos.
 */
export default function WorkoutWizardStructureScreen() {
  const router = useRouter();
  const { studentId, studentName } = useLocalSearchParams<{
    studentId: string;
    studentName?: string;
  }>();
  const wizard = useWorkoutWizardStore();
  const { createPeriodization, createTrainingPlan, fetchPeriodizationPhases } = useWorkoutStore();
  const token = useAuthStore((s) => s.session?.access_token ?? null);
  const specialistId = useAuthStore((s) => s.user?.id ?? null);

  const [startPoint, setStartPoint] = useState<PontoDePartida>('scratch');
  const [aiProposal, setAiProposal] = useState<PeriodizationProposal | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reiniciar o rascunho é só sobre trocar de aluno, não sobre o nome dele mudar
  useEffect(() => {
    if (studentId) wizard.startFor(studentId, studentName ?? 'Aluno');
  }, [studentId]);

  async function requestAiSuggestion() {
    if (!token || !studentId) return;
    setAiLoading(true);
    try {
      const sessionId =
        wizard.aiSessionId ?? (await WorkoutChatService.loadSession(token, studentId)).sessionId;
      wizard.setAiSessionId(sessionId);

      let proposal: PeriodizationProposal | null = null;
      let erro: string | null = null;
      await WorkoutChatService.sendMessage(
        token,
        studentId,
        mensagemParaIa(wizard),
        sessionId,
        (event) => {
          if (event.type === 'proposal') proposal = event.data;
          if (event.type === 'error') erro = event.message;
        }
      );

      if (erro || !proposal) throw new Error(erro ?? 'sem proposta');
      setAiProposal(proposal);
    } catch {
      showAlert({
        title: 'IA indisponível',
        message: 'Não consegui gerar uma sugestão agora. Tente de novo ou monte do zero.',
        type: 'error',
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function approveAiProposal() {
    if (!token || !studentId || !wizard.aiSessionId) return;
    setSaving(true);
    try {
      const saved = await WorkoutChatService.approvePeriodization(
        token,
        studentId,
        wizard.aiSessionId
      );
      await fetchPeriodizationPhases(saved.id);
      const primeiraFase = useWorkoutStore.getState().currentPeriodizationPhases[0];
      if (!primeiraFase) throw new Error('sem fases');

      wizard.setCreatedStructure(saved.id, primeiraFase.id);
      router.push({ pathname: ROUTES.WORKOUTS.WIZARD_BUILD, params: { studentId } });
    } catch {
      showAlert({ title: 'Erro', message: 'Não consegui salvar a proposta da IA.', type: 'error' });
    } finally {
      setSaving(false);
    }
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

  const rotuloDoRodape =
    startPoint !== 'ai' ? 'Continuar' : aiProposal ? 'Usar esta proposta' : 'Pedir sugestão à IA';
  const onPressRodape =
    startPoint !== 'ai'
      ? saveManualStructure
      : aiProposal
        ? approveAiProposal
        : requestAiSuggestion;

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        <BotaoFixoNoRodape
          rotulo={saving || aiLoading ? 'Aguarde…' : rotuloDoRodape}
          icone="arrow-forward"
          onPress={onPressRodape}
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
          sub="Gera a periodização a partir do objetivo"
          selected={startPoint === 'ai'}
          onPress={() => setStartPoint('ai')}
        />
        <Row
          icon="create-outline"
          title="Do zero"
          sub="Montar exercício por exercício"
          selected={startPoint === 'scratch'}
          onPress={() => setStartPoint('scratch')}
        />
        <Row
          icon="bookmark-outline"
          title="Meu modelo"
          sub="Em breve"
          selected={startPoint === 'template'}
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

      {startPoint === 'ai' && aiProposal ? <PropostaDaIa proposta={aiProposal} /> : null}
    </GlassScreen>
  );
}

function PropostaDaIa({ proposta }: { proposta: PeriodizationProposal }) {
  return (
    <Card className="mt-1">
      <Text className="text-[0.95rem] font-bold text-foreground">{proposta.name}</Text>
      <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
        {proposta.durationWeeks} semanas · nível {proposta.level}
      </Text>
      {proposta.phases.map((fase) => (
        <Text key={fase.name} className="mt-2 text-[0.8125rem] text-foreground">
          {fase.name} · {fase.weeks} sem · {fase.focus}
        </Text>
      ))}
    </Card>
  );
}
