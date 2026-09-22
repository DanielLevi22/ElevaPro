import type { WorkoutExercise } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { useCores, useEscala } from '@/shared/design';

function resumoDoExercicio(item: {
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
}): string {
  const partes = [
    item.sets ? `${item.sets} séries` : null,
    item.reps ? `${item.reps} reps` : null,
    item.rest_seconds ? `${item.rest_seconds}s descanso` : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Sem configuração';
}

const TAMANHO_DA_SETA = 15;
const TAMANHO_DA_LIXEIRA = 16;

interface ExercicioDoTreinoCardProps {
  item: WorkoutExercise;
  podeSubir: boolean;
  podeDescer: boolean;
  onSubir: () => void;
  onDescer: () => void;
  /** Sem isto, o cartão só reordena — a Montagem do wizard não edita item já criado. */
  onEditar?: () => void;
  onRemover?: () => void;
}

/**
 * Uma linha de exercício do treino, no mesmo vidro das entradas da home —
 * a Montagem do wizard e a ficha do treino usam a mesma linha, a segunda só
 * acrescenta editar e remover.
 *
 * @example
 * <ExercicioDoTreinoCard item={item} podeSubir podeDescer
 *   onSubir={...} onDescer={...} onEditar={...} onRemover={...} />
 */
export function ExercicioDoTreinoCard({
  item,
  podeSubir,
  podeDescer,
  onSubir,
  onDescer,
  onEditar,
  onRemover,
}: ExercicioDoTreinoCardProps) {
  return (
    <LinhaDeVidro
      icon="barbell"
      tom="marca"
      titulo={item.exercise?.name ?? 'Exercício'}
      sub={resumoDoExercicio(item)}
      onPress={onEditar}
      direita={
        <SetasDeOrdem
          podeSubir={podeSubir}
          podeDescer={podeDescer}
          onSubir={onSubir}
          onDescer={onDescer}
          onRemover={onRemover}
          nomeDoExercicio={item.exercise?.name}
        />
      }
    />
  );
}

function SetasDeOrdem({
  podeSubir,
  podeDescer,
  onSubir,
  onDescer,
  onRemover,
  nomeDoExercicio,
}: {
  podeSubir: boolean;
  podeDescer: boolean;
  onSubir: () => void;
  onDescer: () => void;
  onRemover?: () => void;
  nomeDoExercicio?: string;
}) {
  const cores = useCores();
  const escalar = useEscala();
  const rotulo = nomeDoExercicio ?? 'exercício';

  return (
    <View className="flex-row items-center gap-1.5">
      {onRemover ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Remover ${rotulo}`}
          onPress={onRemover}
          className="h-7 w-7 items-center justify-center rounded-sm bg-glass-strong"
        >
          <Ionicons
            name="trash-outline"
            size={escalar(TAMANHO_DA_LIXEIRA)}
            color={cores.destructive}
          />
        </TouchableOpacity>
      ) : null}
      <View className="gap-1.5">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Mover ${rotulo} para cima`}
          disabled={!podeSubir}
          onPress={onSubir}
          className="h-7 w-7 items-center justify-center rounded-sm bg-glass-strong"
        >
          <Ionicons
            name="chevron-up"
            size={escalar(TAMANHO_DA_SETA)}
            color={podeSubir ? cores.foreground : cores.placeholder}
          />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Mover ${rotulo} para baixo`}
          disabled={!podeDescer}
          onPress={onDescer}
          className="h-7 w-7 items-center justify-center rounded-sm bg-glass-strong"
        >
          <Ionicons
            name="chevron-down"
            size={escalar(TAMANHO_DA_SETA)}
            color={podeDescer ? cores.foreground : cores.placeholder}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
