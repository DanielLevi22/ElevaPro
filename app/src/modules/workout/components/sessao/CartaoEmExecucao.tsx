import type { SerieFeita, WorkoutExercise } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * O exercício em execução — o único cartão com aro e brilho da primária na
 * tela, porque é onde o aluno está.
 *
 * Mostra a prescrição em chips, o selo de evolução quando a carga subiu desde
 * a última vez, uma célula por série (feita, atual, pendente) e o "Check" que
 * registra a série atual.
 *
 * @example
 * <CartaoEmExecucao item={atual} feitas={sessao.feitas[atual.id] ?? []} selo="+2,5 kg" … />
 */
interface CartaoEmExecucaoProps {
  item: WorkoutExercise;
  feitas: readonly SerieFeita[];
  /** "+2,5 kg" quando a carga de hoje passa a da última vez. */
  selo: string | null;
  onCheck: () => void;
  onAjustar: () => void;
}

const TAMANHO_DO_LAPIS = 15;

export function CartaoEmExecucao({
  item,
  feitas,
  selo,
  onCheck,
  onAjustar,
}: CartaoEmExecucaoProps) {
  const cores = useCores();
  const escalar = useEscala();
  const total = item.sets ?? 0;

  return (
    <Vidro destaque classeExterna="mt-3" className="p-[0.9375rem]">
      <View className="flex-row items-start justify-between gap-2.5">
        <View className="min-w-0 flex-1">
          <Text className="text-[0.65625rem] font-extrabold uppercase tracking-widest text-primary-text">
            Em execução
          </Text>
          <Text className="mt-[0.1875rem] font-display-black text-[1.3125rem] tracking-tight text-foreground">
            {item.exercise?.name ?? 'Exercício'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onAjustar}
          accessibilityRole="button"
          accessibilityLabel="Ajustar séries, carga e descanso"
        >
          <Vidro
            classeExterna="rounded-md"
            className="h-9 w-9 items-center justify-center rounded-md"
          >
            <Ionicons
              name="pencil"
              size={escalar(TAMANHO_DO_LAPIS)}
              color={cores.mutedForeground}
            />
          </Vidro>
        </TouchableOpacity>
      </View>

      <ChipsDaPrescricao item={item} selo={selo} />
      <CelulasDasSeries total={total} feitas={feitas} />

      <View className="mt-[0.8125rem] flex-row items-center gap-2.5">
        <View className="h-[2.875rem] flex-1 items-center justify-center overflow-hidden rounded-[0.875rem] bg-glass-strong">
          <View
            className="absolute bottom-0 left-0 top-0 bg-primary opacity-30"
            style={{ width: `${total > 0 ? (feitas.length / total) * 100 : 0}%` }}
          />
          <Text className="text-[0.65625rem] font-extrabold uppercase tracking-widest text-foreground">
            {feitas.length} / {total} concluídas
          </Text>
        </View>
        <BotaoDeDestaque rotulo="Check" icone="checkmark" tamanho="compacto" onPress={onCheck} />
      </View>
    </Vidro>
  );
}

function ChipsDaPrescricao({ item, selo }: { item: WorkoutExercise; selo: string | null }) {
  const carga = item.weight ? `${String(item.weight).replace('.', ',')} kg` : null;
  return (
    <View className="mt-3 flex-row flex-wrap gap-[0.4375rem]">
      <Chip icone="repeat">{`${item.sets ?? 0} × ${item.reps ?? '—'}`}</Chip>
      {carga ? <Chip icone="barbell-outline">{carga}</Chip> : null}
      {item.rest_seconds ? <Chip icone="time-outline">{`${item.rest_seconds} s`}</Chip> : null}
      {selo ? (
        <Chip tom="evolucao" icone="trending-up">
          {selo}
        </Chip>
      ) : null}
    </View>
  );
}

/** Feita em verde com as repetições; a atual em primária; as pendentes em vidro. */
function CelulasDasSeries({ total, feitas }: { total: number; feitas: readonly SerieFeita[] }) {
  return (
    <View className="mt-3.5 flex-row gap-1.5">
      {Array.from({ length: total }, (_, indice) => {
        const feita = feitas[indice];
        const atual = indice === feitas.length;
        return (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: a série é a própria posição
            key={indice}
            className={cn(
              'h-11 flex-1 items-center justify-center gap-px rounded-[0.8125rem] border',
              feita ? 'border-transparent bg-metrica-passos/20' : null,
              atual ? 'border-primary bg-primary/20' : null,
              !feita && !atual ? 'border-transparent bg-glass-strong' : null
            )}
          >
            <Text className="text-[0.5625rem] font-bold uppercase tracking-widest text-placeholder">
              S{indice + 1}
            </Text>
            <Text
              className={cn(
                'font-display-black text-[0.78125rem]',
                feita ? 'text-metrica-passos' : atual ? 'text-primary-text' : 'text-placeholder'
              )}
            >
              {feita?.reps ?? '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
