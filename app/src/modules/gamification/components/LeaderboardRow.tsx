import { type LeaderboardEntry, withThousands } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { initialOf, type RankChange, rankChange } from '../utils/leaderboardView';

/**
 * Uma linha da classificação: posição, inicial, nome, pontos e quanto a pessoa
 * andou desde a semana passada. A do usuário leva a borda da primária e "Você".
 *
 * @example <LeaderboardRow entry={entry} />
 */
interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

/**
 * Classe literal por tom: montar `text-${tom}` gera classe que não existe no CSS.
 * Sucesso e perigo no par de texto, que escurece no tema claro: o `success` puro
 * não passa AA sobre o vidro claro.
 */
const CHANGE_COLOR: Record<RankChange['tone'], string> = {
  up: 'text-texto-saude-passos',
  down: 'text-texto-perigo',
  same: 'text-placeholder',
  new: 'text-placeholder',
};

const CHANGE_READING: Record<RankChange['tone'], string> = {
  up: 'subiu',
  down: 'desceu',
  same: 'manteve a posição',
  new: 'estreou na semana',
};

export function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const change = rankChange(entry);

  return (
    <Vidro
      destaque={entry.isMe}
      classeExterna="mb-[0.5625rem]"
      className="flex-row items-center gap-3 px-3.5 py-3"
      accessible
      accessibilityLabel={`${entry.rank}º, ${entry.displayName}, ${entry.points} pontos, ${CHANGE_READING[change.tone]}`}
    >
      <Text className="w-[1.375rem] shrink-0 text-[0.875rem] font-bold text-muted-foreground">
        {entry.rank}
      </Text>
      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-glass-strong">
        <Text className="text-[0.875rem] font-bold text-foreground">
          {initialOf(entry.displayName)}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-[0.4375rem]">
          <Text
            numberOfLines={1}
            className="shrink text-[0.90625rem] font-semibold tracking-tight text-foreground"
          >
            {entry.displayName}
          </Text>
          {entry.isMe ? <Chip tom="destaque">Você</Chip> : null}
        </View>
        <Text className="mt-px text-[0.75rem] text-muted-foreground">
          {withThousands(entry.points)} pts
        </Text>
      </View>
      <Text className={cn('text-[0.75rem] font-bold', CHANGE_COLOR[change.tone])}>
        {change.label}
      </Text>
    </Vidro>
  );
}
