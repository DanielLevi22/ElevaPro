import type { WorkoutExercise } from '@elevapro/shared';
import { formatarCarga, summarizeSetPlan } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { DadoComIcone } from '@/components/ui/DadoComIcone';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { techniqueRouteFor } from '@/shared/technique/analyzableExercises';
import { TECHNIQUE_RELEASED } from '@/shared/technique/release';
import { prescriptionSummary } from '../../store/sessionPlan';
import { MethodTag, methodsByIds } from '../MethodTag';

/**
 * Um exercício do treino: foto do grupo, nome, séries, carga, descanso, as
 * técnicas do plano e a ordem.
 * O que o app sabe analisar ganha "Analisar técnica" (#361): é no treino que o
 * aluno está fazendo o movimento.
 *
 * Carga e descanso só aparecem quando o especialista os prescreveu. O kit os
 * mostra sempre; zerá-los aqui seria prescrever "0 kg".
 *
 * Com `onMais`, o número da ordem dá lugar ao "…" que abre "Trocar exercício"
 * (desenho 6d).
 *
 * @example
 * <LinhaDoExercicio item={item} ordem={1} onMais={() => abrirTroca(item)} />
 */
interface LinhaDoExercicioProps {
  item: WorkoutExercise;
  ordem: number;
  onMais?: () => void;
}

export function LinhaDoExercicio({ item, ordem, onMais }: LinhaDoExercicioProps) {
  const resumo = prescriptionSummary(item);
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
          {resumo.sets > 0 ? (
            <DadoComIcone icone="repeat" texto={`${resumo.sets} × ${resumo.reps}`} />
          ) : null}
          {resumo.load !== null ? (
            <DadoComIcone icone="barbell-outline" texto={formatarCarga(resumo.load)} />
          ) : null}
          {resumo.rest ? <DadoComIcone icone="time-outline" texto={`${resumo.rest} s`} /> : null}
        </View>
        <PlanMethods item={item} />
        <AnalyzeTechnique exerciseName={item.exercise?.name} />
      </View>
      {onMais ? (
        <BotaoDeMais exerciseName={item.exercise?.name} onPress={onMais} />
      ) : (
        <Text className="text-micro font-bold text-placeholder">
          {String(ordem).padStart(2, '0')}
        </Text>
      )}
    </Vidro>
  );
}

/**
 * As técnicas do plano, das séries e dos blocos (#431): o aluno vê antes de
 * começar que hoje tem rest-pause, e não descobre no meio da série.
 */
function PlanMethods({ item }: { item: WorkoutExercise }) {
  const methods = methodsByIds(summarizeSetPlan(item.set_plan).methods);
  if (methods.length === 0) return null;
  return (
    <View className="mt-1.5 flex-row flex-wrap gap-1">
      {methods.map((method) => (
        <MethodTag key={method.id} method={method} />
      ))}
    </View>
  );
}

const MORE_SIZE = 16;

/** O "…" redondo do kit, que abre a troca do exercício. */
function BotaoDeMais({ exerciseName, onPress }: { exerciseName?: string; onPress: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Trocar ${exerciseName ?? 'o exercício'}`}
      hitSlop={8}
      className="h-[1.875rem] w-[1.875rem] items-center justify-center rounded-full bg-glass-strong"
    >
      <Ionicons
        name="ellipsis-horizontal"
        size={escalar(MORE_SIZE)}
        color={cores.mutedForeground}
      />
    </TouchableOpacity>
  );
}

const ICON_SIZE = 12;

/** A pílula do kit (`Chip`), na primária e tocável. Some no que não tem análise. */
function AnalyzeTechnique({ exerciseName }: { exerciseName: string | undefined }) {
  const router = useRouter();
  const cores = useCores();
  const escalar = useEscala();
  const route = techniqueRouteFor(exerciseName);
  // Em desenvolvimento, não se oferece o que não abre.
  if (!TECHNIQUE_RELEASED || !route) return null;

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
