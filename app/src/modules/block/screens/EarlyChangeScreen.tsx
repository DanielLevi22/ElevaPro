import { blockWeek, contagem } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { useActiveBlock } from '@/hooks/useActiveBlock';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { useBlockReport } from '../hooks/useBlockReview';
import { changeLabel } from '../services/changeLabel';
import { useReviewStore } from '../store/reviewStore';

/**
 * C2 · O bloco atual termina hoje: nada é apagado, ele fica no histórico com o
 * que a pessoa fez, as cargas continuam e o novo começa amanhã. Só "Gerar
 * plano novo" segue; até aprovar o novo, o atual continua valendo.
 *
 * @example <EarlyChangeScreen />
 */
export function EarlyChangeScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const block = useActiveBlock(userId);
  const changes = useReviewStore((state) => state.changes);
  const stalled = useReviewStore((state) => state.stalled);
  const { data: report } = useBlockReport(userId, block);
  const shortName = block?.name.split(' · ')[0] ?? 'bloco atual';
  const weeks = block ? Math.max(1, blockWeek(block, localDateKey()).week) : 0;

  return (
    <FlowFrame
      header={{}}
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{ rotulo: 'Voltar', icone: 'chevron-back', onPress: router.back }}
          principal={{
            rotulo: 'Gerar plano novo',
            icone: 'sparkles-outline',
            onPress: () => router.push(ROUTES.BLOCK.BUILDING),
          }}
        />
      }
    >
      <View className="mt-5">
        <CaixaDeIcone icon="flag-outline" tom="marca" tamanho="destaque" />
      </View>
      <FlowTitle
        eyebrow={changeLabel(changes)}
        sub="Nada é apagado. O bloco atual fecha e o novo começa amanhã."
      >
        {`O ${shortName} termina hoje`}
      </FlowTitle>
      <View className="mt-5">
        <LinhaDeVidro
          icon="time-outline"
          tom="marca"
          titulo="Fica no seu histórico"
          sub={
            report
              ? `${contagem(weeks, 'semana', 'semanas')}, ${contagem(report.workouts.done, 'treino', 'treinos')} e ${contagem(report.records, 'recorde', 'recordes')}`
              : contagem(weeks, 'semana', 'semanas')
          }
          direita={<View />}
        />
        <LinhaDeVidro
          icon="barbell-outline"
          tom="marca"
          titulo="Suas cargas continuam"
          sub="O plano novo parte do que você já levanta"
          direita={<View />}
        />
        <LinhaDeVidro
          icon="calendar-outline"
          tom="marca"
          titulo="O próximo bloco começa amanhã"
          sub={`4 semanas, montado a partir ${stalled && Object.keys(changes).length === 0 ? 'do que você levanta hoje' : 'da mudança'}`}
          direita={<View />}
        />
      </View>
    </FlowFrame>
  );
}
