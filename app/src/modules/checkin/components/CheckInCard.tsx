import type { WeeklyCheckIn } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCheckInProposal, useCheckInSummary } from '../hooks/useWeeklyCheckIn';
import { adjustmentCopy } from '../services/adjustmentCopy';

const kcal = (value: number) => `${value.toLocaleString('pt-BR')} kcal`;

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
  if (!summary) return null;
  if (summary.state === 'due') return <DueCard />;
  if (summary.state === 'pending') return <PendingCard userId={userId} checkIn={summary.checkIn} />;
  if (summary.state === 'approved' && summary.targetCalories !== null) {
    return <ApprovedCard targetCalories={summary.targetCalories} />;
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
    ? `Meta proposta: ${kcal(proposal.recalibration.proposedCalories)}`
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

function ApprovedCard({ targetCalories }: { targetCalories: number }) {
  return (
    <Vidro classeExterna="mt-5" className="flex-row items-center gap-3 p-3.5">
      <CaixaDeIcone icon="checkmark-circle-outline" tom="marca" tamanho="linha" />
      <View className="flex-1">
        <Text className="text-[0.90625rem] font-bold text-hero">{`Plano atualizado · ${kcal(targetCalories)}`}</Text>
        <Text className="mt-0.5 text-xs text-hero-secondary">
          Cardápio refeito para a nova meta
        </Text>
      </View>
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
