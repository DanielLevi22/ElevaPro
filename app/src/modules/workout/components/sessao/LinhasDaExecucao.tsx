import {
  formatarCarga,
  numeroDaPrescricao,
  type SerieFeita,
  type WorkoutExercise,
} from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * As duas linhas que cercam o cartão em execução: o exercício já feito,
 * esmaecido e riscado, e o que vem a seguir.
 */

/** "4 × 8-10 · 45 kg", como a prescrição (ou o ajuste) diz. */
export function prescricao(item: WorkoutExercise): string {
  const carga = numeroDaPrescricao(item.weight);
  const series = `${item.sets ?? 0} × ${item.reps ?? '—'}`;
  return carga === null ? series : `${series} · ${formatarCarga(carga)}`;
}

/**
 * "12-15 reps", mas "10 min" sozinho: repetição só quando a prescrição é
 * quantidade. Tempo com "repetições" atrás dizia uma coisa que o treino não é.
 *
 * @example textoDasRepeticoes('8-10', 'reps') // "8-10 reps"
 */
export function textoDasRepeticoes(reps: string | null, unidade: 'reps' | 'repetições'): string {
  if (!reps) return '—';
  return numeroDaPrescricao(reps) === null ? reps : `${reps} ${unidade}`;
}

const TAMANHO_DO_CHECK = 18;
const TAMANHO_DA_SETA = 16;

interface ExercicioFeitoProps {
  item: WorkoutExercise;
  feitas: readonly SerieFeita[];
}

/** O exercício concluído: "4/4 séries · 60 kg". */
export function ExercicioFeito({ item, feitas }: ExercicioFeitoProps) {
  const cores = useCores();
  const escalar = useEscala();
  const carga = feitas.reduce((maior, serie) => Math.max(maior, serie.carga ?? 0), 0);

  return (
    <View className="mt-3 opacity-60">
      <Vidro className="flex-row items-center gap-3 p-[0.8125rem]">
        <View className="h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-full bg-metrica-passos">
          <Ionicons
            name="checkmark"
            size={escalar(TAMANHO_DO_CHECK)}
            color={cores.primaryForeground}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[0.90625rem] font-semibold text-foreground line-through"
          >
            {item.exercise?.name ?? 'Exercício'}
          </Text>
          <Text className="mt-px text-micro text-muted-foreground">
            {feitas.length}/{item.sets ?? 0} séries{carga > 0 ? ` · ${formatarCarga(carga)}` : ''}
          </Text>
        </View>
      </Vidro>
    </View>
  );
}

interface ExercicioASeguirProps {
  item: WorkoutExercise;
  onEscolher: () => void;
}

/** O exercício pendente. Tocar o traz para a execução — a ordem é do aluno. */
export function ExercicioASeguir({ item, onEscolher }: ExercicioASeguirProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onEscolher}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Fazer agora: ${item.exercise?.name ?? 'exercício'}`}
      className="mb-[0.5625rem]"
    >
      <Vidro className="flex-row items-center gap-3 p-3">
        <View className="h-[1.875rem] w-[1.875rem] shrink-0 rounded-full border-[0.09375rem] border-placeholder" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
            {item.exercise?.name ?? 'Exercício'}
          </Text>
          <Text className="mt-px text-[0.71875rem] text-muted-foreground">{prescricao(item)}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={escalar(TAMANHO_DA_SETA)}
          color={cores.placeholder}
        />
      </Vidro>
    </TouchableOpacity>
  );
}
