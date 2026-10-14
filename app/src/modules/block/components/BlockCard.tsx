import { blockWeek } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Vidro } from '@/components/ui/Vidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { useBlockStore } from '../store/blockStore';

/**
 * O bloco do Praticante na tela inicial: o aviso da semana de descarga, até
 * ser aberto (A7). Fora dela, e para o Aluno, não aparece.
 *
 * @example <HomeDoAluno dados={aluno} aviso={<BlockCard />} />
 */
export function BlockCard() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const block = useActiveBlock(userId);
  const seen = useBlockStore((state) => (block ? state.deloadSeen.includes(block.id) : true));
  if (!block || seen || !blockWeek(block, localDateKey()).deload) return null;

  return (
    <Vidro classeExterna="mt-5" destaque className="gap-3 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-primary-text">
          Semana 4 do bloco
        </Text>
        <Text className="text-[0.6875rem] text-hero-secondary">descarga</Text>
      </View>
      <View>
        <Text className="font-display-black text-[1.375rem] tracking-tight text-hero">
          Semana de descarga
        </Text>
        <Text className="mt-1 text-[0.78125rem] leading-[1.1rem] text-hero-secondary">
          Metade das séries, a mesma carga. Faz parte do plano.
        </Text>
      </View>
      <BotaoDeDestaque
        rotulo="Ver o que muda"
        tamanho="cartao"
        onPress={() => router.push(ROUTES.BLOCK.DELOAD)}
      />
    </Vidro>
  );
}
