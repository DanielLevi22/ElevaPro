import { addDays } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { useBlockStore } from '../store/blockStore';
import { useReviewStore } from '../store/reviewStore';

/**
 * B1 · Hora da reavaliação: o bloco acabou, e em poucos minutos a pessoa mede
 * o que mudou e monta o próximo. "Lembrar amanhã" tira o cartão do início até
 * o dia seguinte; o bloco atual segue valendo enquanto isso.
 *
 * @example <ReviewScreen />
 */
export function ReviewScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const block = useActiveBlock(userId);
  const snooze = useBlockStore((state) => state.snoozeReview);
  const resetReview = useReviewStore((state) => state.reset);

  function start() {
    resetReview();
    router.push(ROUTES.BLOCK.MEASURES);
  }

  function later() {
    if (block) snooze(block.id, addDays(localDateKey(), 1));
    router.replace(ROUTES.TABS.ROOT);
  }

  return (
    <FlowFrame
      header={{}}
      primary={{ label: 'Começar', icon: 'arrow-forward', onPress: start }}
      secondaryText={{ label: 'Lembrar amanhã', onPress: later }}
    >
      <View className="mt-5">
        <CaixaDeIcone icon="flag-outline" tom="marca" tamanho="destaque" />
      </View>
      <FlowTitle
        eyebrow={block ? `${block.name} · concluído` : 'Bloco concluído'}
        sub="4 semanas. Em poucos minutos a gente mede o que mudou e monta o próximo bloco a partir disso."
      >
        Hora da reavaliação
      </FlowTitle>
      <View className="mt-5">
        <LinhaDeVidro
          icon="scale-outline"
          tom="marca"
          titulo="Peso e cintura"
          sub="Já vem preenchido da sua última medida"
          direita={<Minutes>1 min</Minutes>}
        />
        <LinhaDeVidro
          icon="list-outline"
          tom="marca"
          titulo="Mudou alguma coisa?"
          sub="Objetivo, dias, local e dor"
          direita={<Minutes>1 min</Minutes>}
        />
        <LinhaDeVidro
          icon="scan-outline"
          tom="marca"
          titulo="Body scan"
          sub="Opcional · duas fotos, frente e lado"
          onPress={() => router.push(ROUTES.ASSESSMENT.TUTORIAL)}
        />
      </View>
      <InfoNote icon="information-circle-outline" className="mt-1">
        Sem body scan, o bloco novo sai só com peso e cintura.
      </InfoNote>
    </FlowFrame>
  );
}

function Minutes({ children }: { children: string }) {
  return <Text className="text-[0.71875rem] text-muted-foreground">{children}</Text>;
}
