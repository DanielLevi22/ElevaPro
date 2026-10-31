import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BeforeAfterRow } from '@/components/ui/BeforeAfterRow';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { Vidro } from '@/components/ui/Vidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { ROUTES } from '@/navigation/types';
import { useBlockStore } from '../store/blockStore';

/**
 * A7 · Semana 4: descarga. Não é ajuste, é o plano: a cada 4 semanas, metade
 * das séries com a mesma carga, e a meta de calorias igual. Abrir marca como
 * visto, e o cartão da tela inicial sai.
 *
 * @example <DeloadScreen />
 */
export function DeloadScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const block = useActiveBlock(userId);
  const markSeen = useBlockStore((state) => state.markDeloadSeen);

  useEffect(() => {
    if (block) markSeen(block.id);
  }, [block, markSeen]);

  return (
    <FlowFrame
      header={{}}
      primary={{
        label: 'Entendi',
        icon: 'checkmark',
        onPress: () => router.replace(ROUTES.TABS.ROOT),
      }}
    >
      <View className="mt-7">
        <CaixaDeIcone icon="battery-charging-outline" tom="marca" tamanho="destaque" />
      </View>
      <FlowTitle
        eyebrow="Fim do bloco"
        sub="Metade do volume para o corpo recuperar. Já estava no seu plano: a cada 4 semanas."
      >
        Semana 4: descarga
      </FlowTitle>
      <Vidro classeExterna="mt-5" className="px-3.5">
        <BeforeAfterRow
          first
          icon="layers-outline"
          title="Séries por exercício"
          before="todas"
          after="metade · mesma carga"
          badge="−50% vol."
        />
        <BeforeAfterRow
          icon="flag-outline"
          title="Meta de calorias"
          before="a sua"
          after="a mesma"
          badge="igual"
        />
      </Vidro>
      <InfoNote icon="information-circle-outline" className="mt-3">
        No fim da semana, a reavaliação monta o seu próximo bloco.
      </InfoNote>
    </FlowFrame>
  );
}
