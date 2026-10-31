import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BeforeAfterRow } from '@/components/ui/BeforeAfterRow';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { Vidro } from '@/components/ui/Vidro';
import { useRestPeriods } from '@/hooks/useRestPeriods';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { restCardState } from '../services/restCopy';
import { useBlockStore } from '../store/blockStore';

/**
 * A8 Volta · Bem-vindo de volta: depois de uma pausa longa, a semana começa
 * mais leve, com as cargas 20% menores para reacostumar. Abrir marca como
 * visto, e o cartão do início sai.
 *
 * @example <ReturnScreen />
 */
export function ReturnScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const rests = useRestPeriods(userId);
  const markSeen = useBlockStore((state) => state.markReturnSeen);
  const back = restCardState(rests, localDateKey(), []);

  useEffect(() => {
    if (back?.kind === 'return') markSeen(back.rest.id);
  }, [back, markSeen]);

  return (
    <FlowFrame
      header={{}}
      primary={{
        label: 'Começar a semana',
        icon: 'checkmark',
        onPress: () => router.replace(ROUTES.TABS.ROOT),
      }}
    >
      <View className="mt-5">
        <CaixaDeIcone icon="sunny-outline" tom="marca" tamanho="destaque" />
      </View>
      <FlowTitle eyebrow="Fim do Modo Descanso" sub="Esta semana começa mais leve.">
        Bem-vindo de volta
      </FlowTitle>
      <Vidro classeExterna="mt-5" className="px-3.5">
        <BeforeAfterRow
          first
          icon="barbell-outline"
          title="Carga"
          before="como antes"
          after="−20% para reacostumar"
          badge="−20%"
        />
        <BeforeAfterRow
          icon="calendar-outline"
          title="Treinos nesta semana"
          before="todos"
          after="um a menos, se quiser"
          badge="−1"
        />
      </Vidro>
      <InfoNote icon="information-circle-outline" className="mt-3">
        A carga sugerida de cada exercício já vem mais leve. Na semana seguinte, tudo volta ao
        normal.
      </InfoNote>
    </FlowFrame>
  );
}
