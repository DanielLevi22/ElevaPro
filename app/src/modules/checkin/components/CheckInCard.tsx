import { isTodayInBrazil, type RecordedAdjustment, type WeeklyCheckIn } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore, useCan } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import {
  useCheckInActions,
  useCheckInProposal,
  useCheckInSummary,
} from '../hooks/useWeeklyCheckIn';
import { adjustmentCopy } from '../services/adjustmentCopy';
import { formatKcal } from '../services/formatCalories';

/**
 * A6 · O check-in na tela inicial: a próxima ação quando a semana pede
 * check-in, o ajuste esperando decisão, e o plano atualizado depois de
 * aprovar. Fora disso, não aparece.
 *
 * @example <HomeDoAluno dados={aluno} aviso={<CheckInCard />} />
 */
export function CheckInCard() {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const { data: summary } = useCheckInSummary(userId);
  const canCheckIn = useCan('create', 'WeeklyCheckIn');
  if (!summary) return null;
  if (summary.state === 'due') return canCheckIn ? <DueCard /> : null;
  if (summary.state === 'pending') return <PendingCard userId={userId} checkIn={summary.checkIn} />;
  if (summary.state === 'approved' && summary.adjustment) {
    return <ApprovedCard checkInId={summary.checkIn.id} adjustment={summary.adjustment} />;
  }
  return null;
}

function DueCard() {
  const router = useRouter();
  return (
    <Card
      eyebrow="Próxima ação"
      aside="1 min"
      title="Faça o check-in da semana"
      sub="Duas perguntas para ajustar seu plano."
    >
      <BotaoDeDestaque
        rotulo="Começar"
        icone="clipboard-outline"
        tamanho="cartao"
        onPress={() => router.push(ROUTES.CHECKIN.ROOT)}
      />
    </Card>
  );
}

/** O Aluno já foi avisado de que o especialista revisa: o cartão é só do Praticante. */
function PendingCard({ userId, checkIn }: { userId: string | null; checkIn: WeeklyCheckIn }) {
  const router = useRouter();
  const { data: proposal } = useCheckInProposal(userId, checkIn);
  if (proposal?.kind !== 'proposal') return null;
  const copy = adjustmentCopy(proposal.recalibration, checkIn.logging);
  const title = copy.proposesChange
    ? `Meta proposta: ${formatKcal(proposal.recalibration.proposedCalories)}`
    : 'Sua meta segue igual';

  return (
    <Card eyebrow="Ajuste da semana" aside={copy.status.label} title={title} sub={copy.reason}>
      <BotaoDeDestaque
        rotulo="Ver ajuste"
        tamanho="cartao"
        onPress={() => router.push(ROUTES.CHECKIN.RESULT)}
      />
    </Card>
  );
}

/**
 * "Plano atualizado", com o "Desfazer" do mesmo dia: depois disso, a meta só
 * muda no próximo check-in. O banco confere o dia de novo.
 */
function ApprovedCard({
  checkInId,
  adjustment,
}: {
  checkInId: string;
  adjustment: RecordedAdjustment;
}) {
  const { undo } = useCheckInActions();
  const undoable = isTodayInBrazil(adjustment.approvedAt);

  async function undoAdjustment() {
    try {
      await undo.mutateAsync(checkInId);
    } catch {
      registrarFalha('checkin.undo');
      showAlert({
        title: 'Não foi possível desfazer',
        message: 'Sua meta continua a nova. Confira sua conexão e tente de novo.',
        type: 'error',
      });
    }
  }

  return (
    <Vidro classeExterna="mt-5" className="flex-row items-center gap-3 p-3.5">
      <CaixaDeIcone icon="checkmark-circle-outline" tom="marca" tamanho="linha" />
      <View className="flex-1">
        <Text className="text-[0.90625rem] font-bold text-hero">
          {`Plano atualizado · ${formatKcal(adjustment.afterCalories)}`}
        </Text>
        <Text className="mt-0.5 text-xs text-hero-secondary">
          Cardápio refeito para a nova meta
        </Text>
      </View>
      {undoable ? (
        <TouchableOpacity
          onPress={() => void undoAdjustment()}
          disabled={undo.isPending}
          accessibilityRole="button"
          className="py-2"
        >
          <Text className="text-xs font-semibold text-hero-secondary">
            {undo.isPending ? 'Desfazendo…' : 'Desfazer'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </Vidro>
  );
}

function Card({
  eyebrow,
  aside,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  aside: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <Vidro classeExterna="mt-5" destaque className="gap-3 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-primary-text">
          {eyebrow}
        </Text>
        <Text className="text-[0.6875rem] text-hero-secondary">{aside}</Text>
      </View>
      <View>
        <Text className="font-display-black text-[1.375rem] tracking-tight text-hero">{title}</Text>
        <Text className="mt-1 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">{sub}</Text>
      </View>
      {children}
    </Vidro>
  );
}
