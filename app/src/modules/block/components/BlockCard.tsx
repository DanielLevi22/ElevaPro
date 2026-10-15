import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Vidro } from '@/components/ui/Vidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { useRestPeriods } from '@/hooks/useRestPeriods';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { useStalledWeek } from '../hooks/useBlockReview';
import { blockCardState } from '../services/blockCardState';
import { restCardState } from '../services/restCopy';
import { useBlockStore } from '../store/blockStore';
import { useReviewStore } from '../store/reviewStore';
import { RestCard } from './RestCard';

const CARDS = {
  deload: {
    eyebrow: 'Semana 4 do bloco',
    aside: 'descarga',
    title: 'Semana de descarga',
    sub: 'Metade das séries, a mesma carga. Faz parte do plano.',
    action: 'Ver o que muda',
    route: ROUTES.BLOCK.DELOAD,
  },
  review: {
    eyebrow: 'Fim do bloco',
    aside: '4 min',
    title: 'Hora da reavaliação',
    sub: 'Você fechou 4 semanas. Vamos medir o que mudou e montar o próximo bloco.',
    action: 'Começar',
    route: ROUTES.BLOCK.REVIEW,
  },
  stalled: {
    eyebrow: 'Últimas 3 semanas',
    aside: '2 min',
    title: 'Seu peso parou',
    sub: 'Você seguiu a meta e o peso não andou. Dá para reavaliar o bloco agora, sem esperar o fim.',
    action: 'Reavaliar agora',
    route: ROUTES.BLOCK.CHANGES,
  },
} as const;

/**
 * O bloco do Praticante na tela inicial: o aviso da semana de descarga (A7),
 * no fim do bloco a reavaliação (B1), e no meio dele a reavaliação antecipada
 * pelo peso parado (#376). Fora disso, e para o Aluno, não aparece.
 *
 * @example <HomeDoAluno dados={aluno} aviso={<BlockCard />} />
 */
export function BlockCard() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const block = useActiveBlock(userId);
  const deloadSeen = useBlockStore((state) => (block ? state.deloadSeen.includes(block.id) : true));
  const snoozedUntil = useBlockStore((state) =>
    block ? (state.reviewSnoozedUntil[block.id] ?? null) : null
  );
  const rests = useRestPeriods(userId);
  const returnSeen = useBlockStore((state) => state.returnSeen);
  const stallSeen = useBlockStore((state) => state.stallSeen);
  const markStallSeen = useBlockStore((state) => state.markStallSeen);
  const startStalledReview = useReviewStore((state) => state.startStalledReview);
  const stalledWeek = useStalledWeek(userId).data ?? null;
  // A pausa vem primeiro: no Modo Descanso o bloco espera também (#376, A8).
  const rest = restCardState(rests, localDateKey(), returnSeen);
  const state = block
    ? blockCardState(block, localDateKey(), { deloadSeen, snoozedUntil, stalledWeek, stallSeen })
    : null;
  if (rest) return <RestCard state={rest} />;
  if (!state) return null;
  const card = CARDS[state];

  function open() {
    if (state === 'stalled') startStalledReview();
    router.push(card.route);
  }

  return (
    <Vidro classeExterna="mt-5" destaque className="gap-3 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-primary-text">
          {card.eyebrow}
        </Text>
        <Text className="text-[0.6875rem] text-hero-secondary">{card.aside}</Text>
      </View>
      <View>
        <Text className="font-display-black text-[1.375rem] tracking-tight text-hero">
          {card.title}
        </Text>
        <Text className="mt-1 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">
          {card.sub}
        </Text>
      </View>
      <BotaoDeDestaque rotulo={card.action} tamanho="cartao" onPress={open} />
      {state === 'stalled' && stalledWeek ? (
        <Pressable
          onPress={() => markStallSeen(stalledWeek)}
          accessibilityRole="button"
          className="items-center"
        >
          <Text className="text-[0.78125rem] font-semibold text-hero-secondary">Agora não</Text>
        </Pressable>
      ) : null}
    </Vidro>
  );
}
