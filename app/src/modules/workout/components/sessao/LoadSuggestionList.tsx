import type { LoadSuggestion, WorkoutExercise } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { loadSuggestionCopy } from '../../services/loadSuggestionCopy';
import type { LoadSuggestions } from '../../services/sessionLoadSuggestions';

const ICON_SIZE = 12;

/** O selo do kit: o ícone na bolinha primária, o quanto em negrito e o porquê. */
function ReasonBadge({
  suggestion,
  withReason,
}: {
  suggestion: LoadSuggestion;
  withReason: boolean;
}) {
  const colors = useCores();
  const scale = useEscala();
  const copy = loadSuggestionCopy(suggestion);

  return (
    <View className="shrink flex-row items-center gap-[0.4375rem] rounded-full border border-glass-border bg-glass-strong py-[0.3125rem] pl-[0.3125rem] pr-[0.6875rem]">
      <View className="h-5 w-5 items-center justify-center rounded-full bg-primary/20">
        <Ionicons name={copy.icon} size={scale(ICON_SIZE)} color={colors.primary} />
      </View>
      <Text className="shrink text-[0.71875rem] text-muted-foreground">
        <Text className="font-bold text-foreground">{copy.badge}</Text>
        {withReason ? ` · ${copy.reason}` : null}
      </Text>
    </View>
  );
}

/**
 * As cargas de hoje (A1 do kit): por exercício, a carga sugerida e o porquê.
 * Só aparece quando há o que dizer — sem histórico, a prescrição já basta.
 *
 * @example <TodayLoads items={treino.exercises} suggestions={hoje} />
 */
export function TodayLoads({
  items,
  suggestions,
}: {
  items: readonly WorkoutExercise[];
  suggestions: LoadSuggestions;
}) {
  const withHistory = items.filter((item) => {
    const suggestion = suggestions[item.id];
    return suggestion && suggestion.reason !== 'no_history';
  });
  if (withHistory.length === 0) return null;

  return (
    <View className="mt-8 w-full">
      <TituloDeSecao estilo="rotulo" acao="o lápis troca no treino">
        Cargas de hoje
      </TituloDeSecao>
      {withHistory.map((item) => (
        <ExerciseLoad key={item.id} item={item} suggestion={suggestions[item.id]} />
      ))}
    </View>
  );
}

function ExerciseLoad({ item, suggestion }: { item: WorkoutExercise; suggestion: LoadSuggestion }) {
  const { weight } = loadSuggestionCopy(suggestion);

  return (
    <Vidro classeExterna="mb-[0.5625rem]" className="p-[0.8125rem]">
      <Text numberOfLines={1} className="text-[0.90625rem] font-bold text-foreground">
        {item.exercise?.name ?? 'Exercício'}
      </Text>
      <View className="mt-2.5 flex-row items-center gap-2.5">
        {weight ? (
          <View className="shrink-0 rounded-xl border border-glass-border bg-glass-strong px-3 py-1.5">
            <Text className="text-[0.53125rem] font-bold uppercase tracking-widest text-placeholder">
              Carga sugerida
            </Text>
            <Text className="font-display-black text-lg text-foreground">{weight}</Text>
          </View>
        ) : null}
        <ReasonBadge suggestion={suggestion} withReason />
      </View>
    </Vidro>
  );
}

/**
 * Na próxima vez (A3 do kit): o que a carga de cada exercício feito hoje vai
 * ser no próximo treino. Não é gravado: o próximo pré-início recalcula da
 * sessão salva, e a conta é a mesma.
 *
 * @example <NextTimeLoads items={sessao.items} suggestions={proxima} />
 */
export function NextTimeLoads({
  items,
  suggestions,
}: {
  items: readonly WorkoutExercise[];
  suggestions: LoadSuggestions;
}) {
  const done = items.filter((item) => suggestions[item.id]);
  if (done.length === 0) return null;

  return (
    <>
      <TituloDeSecao estilo="rotulo">Na próxima vez</TituloDeSecao>
      {done.map((item) => (
        <Vidro
          key={item.id}
          classeExterna="mb-[0.5625rem]"
          className="flex-row items-center justify-between gap-3 p-[0.8125rem]"
        >
          <Text numberOfLines={1} className="shrink text-sm font-semibold text-foreground">
            {item.exercise?.name ?? 'Exercício'}
          </Text>
          <ReasonBadge suggestion={suggestions[item.id]} withReason={false} />
        </Vidro>
      ))}
    </>
  );
}
