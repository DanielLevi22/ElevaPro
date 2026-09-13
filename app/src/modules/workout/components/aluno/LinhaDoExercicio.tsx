import type { WorkoutExercise } from '@elevapro/shared';
import { Image, Text, View } from 'react-native';
import { DadoComIcone } from '@/components/ui/DadoComIcone';
import { Vidro } from '@/components/ui/Vidro';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';

/**
 * Um exercício do treino: foto do grupo, nome, séries, carga, descanso e ordem.
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
      </View>
      <Text className="text-micro font-bold text-placeholder">
        {String(ordem).padStart(2, '0')}
      </Text>
    </Vidro>
  );
}
