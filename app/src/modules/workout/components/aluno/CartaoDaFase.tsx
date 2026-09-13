import {
  intervaloCurto,
  situacaoDaFase,
  type TomDaFase,
  type TrainingPlan,
} from '@elevapro/shared';
import { Text, TouchableOpacity, View } from 'react-native';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';

/**
 * Uma fase do ciclo: número, nome, datas, situação e quanto já andou.
 *
 * A fase planejada fica esmaecida, como no kit — ainda não é caminho. As
 * concluídas continuam visíveis: a tela anterior as escondia do aluno, e o kit
 * as mostra, porque é assim que ele vê o que já fez.
 *
 * @example
 * <CartaoDaFase fase={fase} numero={2} onPress={abrir} />
 */
interface CartaoDaFaseProps {
  fase: TrainingPlan;
  numero: number;
  onPress: () => void;
}

/** Classe literal por tom: Tailwind só gera o que aparece escrito no fonte. */
const COR_DO_TOM: Record<TomDaFase, string> = {
  concluida: 'text-metrica-passos',
  ativa: 'text-primary-text',
  planejada: 'text-placeholder',
};

const BARRA_DO_TOM = { concluida: 'concluida', ativa: 'marca', planejada: 'apagada' } as const;

export function CartaoDaFase({ fase, numero, onPress }: CartaoDaFaseProps) {
  const situacao = situacaoDaFase(fase, new Date());
  const planejada = situacao.tom === 'planejada';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Fase ${numero}: ${fase.name}, ${situacao.rotulo}`}
      className={cn('mb-2.5', planejada && 'opacity-[0.66]')}
    >
      <Vidro className="p-3.5">
        <View className="flex-row items-center gap-[0.8125rem]">
          <View className="h-10 w-10 items-center justify-center rounded-[0.8125rem] bg-glass-strong">
            <Text className={cn('font-display-black text-[1.0625rem]', COR_DO_TOM[situacao.tom])}>
              {numero}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className="text-rotulo font-bold tracking-tight text-foreground"
            >
              {fase.name}
            </Text>
            <Text className="mt-px text-micro text-muted-foreground">
              {intervaloCurto(fase.start_date, fase.end_date)}
            </Text>
          </View>
          <Text
            className={cn(
              'text-[0.65625rem] font-extrabold uppercase tracking-wider',
              COR_DO_TOM[situacao.tom]
            )}
          >
            {situacao.rotulo}
          </Text>
        </View>
        {situacao.percentual > 0 ? (
          <View className="mt-[0.6875rem]">
            <BarraDeProgresso
              percentual={situacao.percentual}
              tom={BARRA_DO_TOM[situacao.tom]}
              espessura="fina"
            />
          </View>
        ) : null}
      </Vidro>
    </TouchableOpacity>
  );
}
