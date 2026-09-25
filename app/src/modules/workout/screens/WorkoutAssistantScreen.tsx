import type { BulkWorkoutProposal, ChatMessage } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Row } from '@/components/ui/Row';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/navigation/types';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { type PeriodizationProposalState, useAssistantChat } from '../hooks/useAssistantChat';
import { useWorkoutStore } from '../store/workoutStore';
import { useWorkoutWizardStore } from '../store/workoutWizardStore';

/**
 * O mesmo chat de IA do web (`/api/ai/chat/[studentId]`), na casca do wizard
 * mobile — reaproveita a conversa e os endpoints de aprovação que já gravam
 * de verdade, em vez de uma proposta de um tiro só (issue #335).
 */
export default function WorkoutAssistantScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const wizard = useWorkoutWizardStore();
  const { fetchPeriodizationPhases, fetchWorkoutsForPhase } = useWorkoutStore();
  const token = useAuthStore((s) => s.session?.access_token ?? null);
  const rolagem = useRef<ScrollView>(null);

  const handlePeriodizationApproved = useCallback(
    async (periodizationId: string) => {
      await fetchPeriodizationPhases(periodizationId);
      const primeiraFase = useWorkoutStore.getState().currentPeriodizationPhases[0];
      if (primeiraFase) wizard.setCreatedStructure(periodizationId, primeiraFase.id);
    },
    [fetchPeriodizationPhases, wizard]
  );

  const handleWorkoutsApproved = useCallback(() => {
    if (wizard.phaseId) fetchWorkoutsForPhase(wizard.phaseId);
  }, [wizard.phaseId, fetchWorkoutsForPhase]);

  const chat = useAssistantChat({
    token: token ?? '',
    studentId,
    sessionId: wizard.aiSessionId,
    onSessionResolved: wizard.setAiSessionId,
    onPeriodizationApproved: handlePeriodizationApproved,
    onWorkoutsApproved: handleWorkoutsApproved,
  });

  function irParaMontagem() {
    router.replace({ pathname: ROUTES.WORKOUTS.WIZARD_BUILD, params: { studentId } });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GlassScreen
        bottomSpace="actionBar"
        scrollRef={rolagem}
        overlay={<CampoDaConversa respondendo={chat.responding} onEnviar={chat.sendMessage} />}
      >
        <CabecalhoDoAssistente nomeDoAluno={wizard.studentName ?? 'Aluno'} onVoltar={router.back} />

        <Baloes mensagens={chat.messages} />

        {chat.periodizationProposal ? (
          <CartaoDePeriodizacao
            proposta={chat.periodizationProposal}
            salvando={chat.savingPeriodization}
            onAprovar={chat.approvePeriodization}
            onAjustar={() => chat.sendMessage('Quero ajustar algumas coisas na proposta.')}
            onContinuar={irParaMontagem}
          />
        ) : null}

        {chat.workoutsProposal ? (
          <CartaoDeTreinos
            proposta={chat.workoutsProposal}
            salvos={chat.savedWorkoutTitles}
            salvando={chat.savingWorkouts}
            onAprovar={chat.approveWorkouts}
            onAjustar={() => chat.sendMessage('Quero ajustar os treinos da proposta.')}
          />
        ) : null}

        {chat.responding ? <Digitando /> : null}
      </GlassScreen>
    </KeyboardAvoidingView>
  );
}

function CabecalhoDoAssistente({
  nomeDoAluno,
  onVoltar,
}: {
  nomeDoAluno: string;
  onVoltar: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="flex-row items-center gap-3 pt-1.5">
      <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onVoltar} />
      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full border-[0.09375rem] border-primary bg-primary/20">
          <Ionicons name="sparkles" size={escalar(17)} color={cores.primary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[0.96875rem] font-bold tracking-tight text-hero">Assistente</Text>
          <Text className="text-[0.71875rem] font-semibold text-muted-foreground" numberOfLines={1}>
            treino de {nomeDoAluno}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Baloes({ mensagens }: { mensagens: ChatMessage[] }) {
  return (
    <View className="mt-[1.375rem] gap-3">
      {mensagens.map((mensagem) => (
        <Balao key={mensagem.id} mensagem={mensagem} />
      ))}
    </View>
  );
}

function Balao({ mensagem }: { mensagem: ChatMessage }) {
  if (mensagem.role === 'user') {
    return (
      <View className="items-end">
        <View className="max-w-[84%] rounded-[1.25rem] rounded-br-md bg-primary px-3.5 py-3">
          <Text className="text-[0.84375rem] font-semibold leading-[1.22rem] text-primary-foreground">
            {mensagem.content}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View className="items-start">
      <Vidro
        classeExterna="max-w-[84%] rounded-[1.25rem] rounded-bl-md"
        className="rounded-[1.25rem] rounded-bl-md px-3.5 py-3"
      >
        <Text className="text-[0.84375rem] leading-[1.22rem] text-foreground">
          {mensagem.content || '…'}
        </Text>
      </Vidro>
    </View>
  );
}

/** Os três pontos do kit enquanto a resposta não chega. */
function Digitando() {
  return (
    <View className="mt-3 items-start" accessibilityLabel="O assistente está respondendo">
      <Vidro
        classeExterna="rounded-[1.25rem] rounded-bl-md"
        className="flex-row gap-[0.3125rem] rounded-[1.25rem] rounded-bl-md px-3.5 py-3"
      >
        {['a', 'b', 'c'].map((ponto) => (
          <View key={ponto} className="h-1.5 w-1.5 rounded-full bg-placeholder" />
        ))}
      </Vidro>
    </View>
  );
}

function CartaoDePeriodizacao({
  proposta,
  salvando,
  onAprovar,
  onAjustar,
  onContinuar,
}: {
  proposta: PeriodizationProposalState;
  salvando: boolean;
  onAprovar: () => void;
  onAjustar: () => void;
  onContinuar: () => void;
}) {
  const salva = Boolean(proposta.savedId);
  return (
    <Vidro className="mt-3 p-4">
      <Text className="text-[0.95rem] font-bold text-foreground">{proposta.data.name}</Text>
      <Text className="mt-1 text-[0.8125rem] text-muted-foreground">
        {proposta.data.durationWeeks} semanas · nível {proposta.data.level}
      </Text>
      {proposta.data.phases.map((fase) => (
        <Text key={fase.name} className="mt-2 text-[0.8125rem] text-foreground">
          {fase.name} · {fase.weeks} sem · {fase.focus}
        </Text>
      ))}
      {salva ? (
        <View className="mt-3">
          <BotaoDeDestaque
            rotulo="Continuar para montagem"
            icone="arrow-forward"
            tamanho="cartao"
            onPress={onContinuar}
          />
        </View>
      ) : (
        <View className="mt-3 flex-row gap-2">
          <Row
            icon="checkmark-circle-outline"
            title={salvando ? 'Salvando…' : 'Aprovar'}
            onPress={salvando ? undefined : onAprovar}
          />
          <Row icon="create-outline" title="Ajustar" onPress={onAjustar} />
        </View>
      )}
    </Vidro>
  );
}

function CartaoDeTreinos({
  proposta,
  salvos,
  salvando,
  onAprovar,
  onAjustar,
}: {
  proposta: BulkWorkoutProposal;
  salvos: string[];
  salvando: boolean;
  onAprovar: () => void;
  onAjustar: () => void;
}) {
  const resolvido = salvos.length > 0;
  return (
    <Vidro destaque={resolvido} className="mt-3 p-4">
      <Text className="text-[0.95rem] font-bold text-foreground">
        Treinos · {proposta.phase_name}
      </Text>
      {proposta.workouts.map((treino) => (
        <Text key={treino.title} className="mt-2 text-[0.8125rem] text-foreground">
          {treino.title} · {treino.exercises?.length ?? 0} exercícios
        </Text>
      ))}
      {!resolvido && (
        <View className="mt-3 flex-row gap-2">
          <Row
            icon="checkmark-circle-outline"
            title={salvando ? 'Salvando…' : 'Aprovar todos'}
            onPress={salvando ? undefined : onAprovar}
          />
          <Row icon="create-outline" title="Ajustar" onPress={onAjustar} />
        </View>
      )}
    </Vidro>
  );
}

/** Mesma altura da barra de duas ações do kit, no mesmo lugar acima da tab bar. */
const ACIMA_DO_INSET = 84;
const BRILHO_DO_ENVIO = { y: 10, blur: 26, espalhamento: -10 } as const;

function CampoDaConversa({
  respondendo,
  onEnviar,
}: {
  respondendo: boolean;
  onEnviar: (texto: string) => void;
}) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const podeEnviar = texto.trim().length > 0 && !respondendo;

  const enviar = () => {
    if (!podeEnviar) return;
    onEnviar(texto);
    setTexto('');
  };

  return (
    <View
      className="absolute left-[1.125rem] right-[1.125rem] flex-row gap-[0.5625rem]"
      style={{ bottom: insets.bottom + escalar(ACIMA_DO_INSET) }}
    >
      <View className="h-[2.625rem] flex-1 justify-center overflow-hidden rounded-[0.8125rem] border border-glass-border bg-background px-3.5">
        <View className="absolute inset-0 bg-glass-strong" />
        <TextInput
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={enviar}
          placeholder="Pergunte ao assistente…"
          placeholderTextColor={cores.placeholder}
          returnKeyType="send"
          editable={!respondendo}
          accessibilityLabel="Mensagem para o assistente"
          className="text-[0.84375rem] text-foreground"
        />
      </View>
      <TouchableOpacity
        onPress={enviar}
        disabled={!podeEnviar}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
        accessibilityState={{ disabled: !podeEnviar }}
        className={cn(
          'h-[2.625rem] w-[2.625rem] items-center justify-center rounded-[0.8125rem]',
          podeEnviar ? 'bg-primary' : 'border border-glass-border bg-background'
        )}
        style={podeEnviar ? { boxShadow: brilho(BRILHO_DO_ENVIO, { alfa: 0.8 }) } : undefined}
      >
        <Ionicons
          name="send"
          size={escalar(15)}
          color={podeEnviar ? cores.primaryForeground : cores.placeholder}
        />
      </TouchableOpacity>
    </View>
  );
}
