import type { CheckInProposal, WeeklyCheckIn } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { WeightTrend } from '@/components/ui/charts/WeightTrend';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import {
  CalculatingState,
  DecidedState,
  NoTargetState,
  SpecialistReviewState,
} from '../components/CheckInStates';
import { DailyLogReminder } from '../components/DailyLogReminder';
import { TargetChange } from '../components/TargetChange';
import {
  useCheckInActions,
  useCheckInProposal,
  useCheckInSummary,
} from '../hooks/useWeeklyCheckIn';
import { adjustmentCopy } from '../services/adjustmentCopy';

type Proposal = Extract<CheckInProposal, { kind: 'proposal' }>;

const STATUS_ICON = 13;

/**
 * A5 · O ajuste da semana: o que o peso fez, a meta proposta e a decisão. Só a
 * aprovação muda a dieta (ADR-0020); "Manter mais uma semana" não muda nada.
 *
 * @example <CheckInResultScreen />
 */
export function CheckInResultScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const summary = useCheckInSummary(userId);
  const checkIn = summary.data && 'checkIn' in summary.data ? summary.data.checkIn : null;
  const proposal = useCheckInProposal(userId, checkIn);
  const home = () => router.replace(ROUTES.TABS.ROOT);

  if (summary.isError || proposal.isError) {
    return (
      <CalculatingState
        failed
        onRetry={() => void Promise.all([summary.refetch(), proposal.refetch()])}
      />
    );
  }
  if (!checkIn || !proposal.data) return <CalculatingState failed={false} onRetry={home} />;
  const result = proposal.data;
  if (result.kind === 'specialist') {
    return (
      <SpecialistReviewState
        specialistName={result.specialistName}
        lastMeasurement={result.lastMeasurement}
        onDone={home}
      />
    );
  }
  if (result.kind === 'decided') {
    return <DecidedState status={result.status} adjustment={result.adjustment} onDone={home} />;
  }
  if (result.kind === 'no_diet') return <NoTargetState onDone={home} />;
  return <ProposalView checkIn={checkIn} proposal={result} onDone={home} />;
}

function ProposalView({
  checkIn,
  proposal,
  onDone,
}: {
  checkIn: WeeklyCheckIn;
  proposal: Proposal;
  onDone: () => void;
}) {
  const { approve, keep } = useCheckInActions();
  const copy = adjustmentCopy(proposal.recalibration, checkIn.logging);
  const busy = approve.isPending || keep.isPending;
  const withoutData =
    proposal.recalibration.verdict === 'insufficient_data' && checkIn.logging === 'partial';

  async function decide(action: 'approve' | 'keep') {
    try {
      if (action === 'approve') {
        await approve.mutateAsync({ checkInId: checkIn.id, recalibration: proposal.recalibration });
      } else {
        await keep.mutateAsync(checkIn.id);
      }
      onDone();
    } catch {
      registrarFalha(`checkin.${action}`);
      showAlert({
        title: 'Não foi possível salvar',
        message: 'Seu plano continua como estava. Confira sua conexão e tente de novo.',
        type: 'error',
      });
    }
  }

  const twoActions = copy.proposesChange;
  return (
    <FlowFrame
      header={{}}
      primary={
        twoActions
          ? undefined
          : {
              label: withoutData ? 'Entendi' : 'Seguir igual',
              icon: 'checkmark',
              onPress: () => void decide('keep'),
              disabled: busy,
            }
      }
      overlay={
        twoActions ? (
          <BarraDeDuasAcoes
            semAbas
            secundaria={{
              rotulo: 'Manter mais uma semana',
              icone: 'pause',
              onPress: () => void decide('keep'),
              desabilitada: busy,
            }}
            principal={{
              rotulo: 'Aprovar',
              icone: 'checkmark',
              onPress: () => void decide('approve'),
              desabilitada: busy,
            }}
          />
        ) : undefined
      }
    >
      <FlowTitle eyebrow="Ajuste da semana">Seu plano para esta semana</FlowTitle>
      <Vidro classeExterna="mt-4" className="px-3 pb-2.5 pt-3">
        <View className="mb-1.5 flex-row items-center justify-between">
          <StatusPill label={copy.status.label} icon={copy.status.icon} />
          <Text className="text-[0.6875rem] text-hero-secondary">{`${proposal.weights.length} pesagens`}</Text>
        </View>
        <WeightTrend
          weights={proposal.weights}
          expectedChangeKg={proposal.recalibration.expectedChangeKg}
        />
      </Vidro>
      <Text className="mt-3.5 text-[0.875rem] leading-[1.27rem] text-hero">{copy.reason}</Text>
      {copy.proposesChange ? (
        <TargetChange
          label="Proposta"
          before={proposal.targetCalories}
          after={proposal.recalibration.proposedCalories}
        />
      ) : null}
      {withoutData ? <DailyLogReminder /> : null}
    </FlowFrame>
  );
}

function StatusPill({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="flex-row items-center gap-1.5 rounded-full border border-glass-border bg-glass-strong px-[0.6875rem] py-[0.3125rem]">
      <Ionicons name={icon} size={escalar(STATUS_ICON)} color={cores.primaryText} />
      <Text className="text-[0.71875rem] font-bold text-hero">{label}</Text>
    </View>
  );
}
