import { contagem } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * Um treino da fase: letra, nome e quantos exercícios, com o estado dele.
 *
 * `proximo` ganha a borda e a letra na primária; `feito` esmaece e troca a seta
 * pelo check. O kit desenha os dois, e é por eles que o aluno lê a semana sem
 * abrir nada.
 *
 * @example
 * <LinhaDoTreinoDaFase letra="B" titulo="Costas & Bíceps" exercicios={6} estado="proximo" onPress={abrir} />
 */
export type EstadoDoTreino = 'proximo' | 'feito' | 'pendente';

interface LinhaDoTreinoDaFaseProps {
  letra: string;
  titulo: string;
  /** `undefined` quando a consulta não trouxe a contagem: a linha a omite. */
  exercicios: number | undefined;
  estado: EstadoDoTreino;
  onPress: () => void;
}

const TAMANHO_DO_ICONE = { check: 18, seta: 17 } as const;

export function LinhaDoTreinoDaFase({
  letra,
  titulo,
  exercicios,
  estado,
  onPress,
}: LinhaDoTreinoDaFaseProps) {
  const cores = useCores();
  const escalar = useEscala();
  const proximo = estado === 'proximo';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Treino ${letra}: ${titulo}${estado === 'feito' ? ', feito nesta semana' : ''}`}
      className={cn('mb-[0.5625rem]', estado === 'feito' && 'opacity-60')}
    >
      <Vidro
        className={cn(
          'flex-row items-center gap-[0.8125rem] p-[0.8125rem]',
          proximo && 'border-primary'
        )}
      >
        <View
          className={cn(
            'h-[2.375rem] w-[2.375rem] items-center justify-center rounded-xl',
            proximo ? 'bg-primary' : 'bg-glass-strong'
          )}
        >
          <Text
            className={cn(
              'font-display-black text-rotulo',
              proximo ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {letra}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[0.90625rem] font-semibold tracking-tight text-foreground"
          >
            {titulo}
          </Text>
          {exercicios === undefined ? null : (
            <Text className="mt-px text-micro text-muted-foreground">
              {contagem(exercicios, 'exercício', 'exercícios')}
            </Text>
          )}
        </View>
        {estado === 'feito' ? (
          <Ionicons
            name="checkmark-circle-outline"
            size={escalar(TAMANHO_DO_ICONE.check)}
            color={cores.metricaPassos}
          />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={escalar(TAMANHO_DO_ICONE.seta)}
            color={cores.placeholder}
          />
        )}
      </Vidro>
    </TouchableOpacity>
  );
}
