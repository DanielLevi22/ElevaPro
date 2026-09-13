import { Text, View } from 'react-native';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { cn } from '@/lib/utils';
import type { ProgressoDaSessao as Progresso } from '../../store/maquinaDaSessao';

/**
 * "Exercício 2 de 6 · 8 de 22 séries", com a barra fina embaixo.
 *
 * @example
 * <ProgressoDaSessao progresso={progressoDaSessao(sessao)} />
 */
export function ProgressoDaSessao({ progresso }: { progresso: Progresso }) {
  const { exercicio, exercicios, seriesFeitas, seriesTotais } = progresso;
  const percentual = seriesTotais > 0 ? (seriesFeitas / seriesTotais) * 100 : 0;

  return (
    <View className="mt-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-micro font-bold text-primary-text">
          Exercício {exercicio} de {exercicios}
        </Text>
        <Text className="text-micro font-bold text-hero-secondary">
          {seriesFeitas} de {seriesTotais} séries
        </Text>
      </View>
      <View className="mt-2">
        <BarraDeProgresso percentual={percentual} espessura="fio" />
      </View>
    </View>
  );
}

interface SeriesDoExercicioProps {
  exercicio: number;
  exercicios: number;
  nome: string;
  feitas: number;
  total: number;
}

/**
 * O progresso do descanso: o exercício pelo nome e um segmento por série,
 * aceso com brilho nas feitas.
 *
 * @example
 * <SeriesDoExercicio exercicio={2} exercicios={6} nome="Remada Curvada" feitas={1} total={4} />
 */
export function SeriesDoExercicio({
  exercicio,
  exercicios,
  nome,
  feitas,
  total,
}: SeriesDoExercicioProps) {
  return (
    <View className="mt-4">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text numberOfLines={1} className="min-w-0 flex-1 text-micro font-bold text-primary-text">
          Exercício {exercicio} de {exercicios}{' '}
          <Text className="font-semibold text-hero-secondary">· {nome}</Text>
        </Text>
        <Text className="text-micro font-bold text-hero-secondary">
          {feitas}/{total} séries
        </Text>
      </View>
      <View className="mt-2 flex-row gap-1">
        {Array.from({ length: total }, (_, indice) => (
          <View
            // A série é a própria posição: não há outra identidade.
            // biome-ignore lint/suspicious/noArrayIndexKey: segmento por posição de série
            key={indice}
            className={cn(
              'h-[0.1875rem] flex-1 rounded-full',
              indice < feitas ? 'bg-primary' : 'bg-glass-strong'
            )}
          />
        ))}
      </View>
    </View>
  );
}
