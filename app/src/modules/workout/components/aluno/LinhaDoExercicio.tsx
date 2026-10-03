import type { WorkoutExercise } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { DadoComIcone } from '@/components/ui/DadoComIcone';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { techniqueRouteFor } from '@/shared/technique/analyzableExercises';

/**
 * Um exercício do treino: foto do grupo, nome, séries, carga, descanso e ordem.
 * O que o app sabe analisar ganha "Analisar técnica" (#361): é no treino que o
 * aluno está fazendo o movimento.
 *
 * Carga e descanso só aparecem quando o especialista os prescreveu. O kit os
 * mostra sempre; zerá-los aqui seria prescrever "0 kg".
 *
 * @example
 * <LinhaDoExercicio item={item} ordem={1} />
 */
interface LinhaDoExercicioProps {
  item: WorkoutExercise;
  ordem: number;
}

export function LinhaDoExercicio({ item, ordem }: LinhaDoExercicioProps) {
  return (
    <Vidro classeExterna="mb-[0.5625rem]" className="flex-row items-center gap-3 p-[0.6875rem]">
      <Image
        source={fotoDoGrupo(item.exercise?.muscle_group)}
        resizeMode="cover"
        className="h-11 w-[3.25rem] rounded-[0.6875rem]"
      />
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[0.90625rem] font-semibold tracking-tight text-foreground"
        >
          {item.exercise?.name ?? 'Exercício'}
        </Text>
        <View className="mt-[0.1875rem] flex-row flex-wrap gap-x-2.5">
          {item.sets ? (
            <DadoComIcone icone="repeat" texto={`${item.sets} × ${item.reps ?? '—'}`} />
          ) : null}
          {item.weight ? (
            <DadoComIcone icone="barbell-outline" texto={`${item.weight} kg`} />
          ) : null}
          {item.rest_seconds ? (
            <DadoComIcone icone="time-outline" texto={`${item.rest_seconds} s`} />
          ) : null}
        </View>
        <AnalyzeTechnique exerciseName={item.exercise?.name} />
      </View>
      <Text className="text-micro font-bold text-placeholder">
        {String(ordem).padStart(2, '0')}
      </Text>
    </Vidro>
  );
}

const ICON_SIZE = 12;

/** A pílula do kit (`Chip`), na primária e tocável. Some no que não tem análise. */
function AnalyzeTechnique({ exerciseName }: { exerciseName: string | undefined }) {
  const router = useRouter();
  const cores = useCores();
  const escalar = useEscala();
  const route = techniqueRouteFor(exerciseName);
  if (!route) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      accessibilityRole="button"
      accessibilityLabel={`Analisar técnica do ${exerciseName}`}
      hitSlop={8}
      className="mt-2 flex-row items-center gap-[0.3125rem] self-start rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1"
    >
      <Ionicons name="body-outline" size={escalar(ICON_SIZE)} color={cores.primaryText} />
      <Text className="text-[0.65625rem] font-extrabold uppercase tracking-wider text-primary-text">
        Analisar técnica
      </Text>
    </TouchableOpacity>
  );
}
