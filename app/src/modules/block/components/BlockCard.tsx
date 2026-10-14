import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Vidro } from '@/components/ui/Vidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { blockCardState } from '../services/blockCardState';
import { useBlockStore } from '../store/blockStore';

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
} as const;

/**
 * O bloco do Praticante na tela inicial: o aviso da semana de descarga (A7) e,
 * no fim do bloco, a reavaliação (B1). Fora disso, e para o Aluno, não aparece.
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
  const state = block ? blockCardState(block, localDateKey(), { deloadSeen, snoozedUntil }) : null;
  if (!state) return null;
  const card = CARDS[state];

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
      <BotaoDeDestaque
        rotulo={card.action}
        tamanho="cartao"
        onPress={() => router.push(card.route)}
      />
    </Vidro>
  );
}
