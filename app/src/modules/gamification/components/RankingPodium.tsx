import { withThousands } from '@elevapro/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { comOpacidade, useBrilho, useCores, useEscala } from '@/shared/design';
import { initialOf, type PodiumSlot } from '../utils/leaderboardView';

/**
 * O pódio do ranking sobre a foto: 2º, 1º e 3º, com a inicial no lugar da foto.
 *
 * O primeiro tem a borda e o brilho da primária e a coroa no tom de atenção; o degrau dele leva o
 * gradiente da primária. Degrau sem ninguém fica vazio, sem nome.
 *
 * @example <RankingPodium slots={view.podium} />
 */
interface RankingPodiumProps {
  slots: PodiumSlot[];
}

/** As alturas do kit: 112, 86 e 68. */
const STEP_HEIGHT = { 1: 'h-[7rem]', 2: 'h-[5.375rem]', 3: 'h-[4.25rem]' } as const;

export function RankingPodium({ slots }: RankingPodiumProps) {
  return (
    <View className="mb-1.5 mt-[1.625rem] flex-row items-end justify-center gap-2.5">
      {slots.map((slot) => (
        <PodiumColumn key={slot.step} slot={slot} />
      ))}
    </View>
  );
}

function PodiumColumn({ slot }: { slot: PodiumSlot }) {
  const { step, entry } = slot;
  return (
    <View className="flex-1 items-center">
      {entry ? (
        <>
          <PodiumAvatar name={entry.displayName} first={step === 1} />
          <Text numberOfLines={1} className="text-[0.78125rem] font-bold text-hero">
            {entry.displayName}
          </Text>
          <Text className="mb-2 text-[0.6875rem] text-hero-tertiary">
            {withThousands(entry.points)} pts
          </Text>
        </>
      ) : null}
      <PodiumStep step={step} label={entry ? String(entry.rank) : ''} />
    </View>
  );
}

function PodiumAvatar({ name, first }: { name: string; first: boolean }) {
  const colors = useCores();
  const scale = useEscala();
  const glow = useBrilho();

  return (
    <>
      <View
        className={cn(
          'mb-2 items-center justify-center rounded-full bg-hero-chip',
          first
            ? 'h-[3.625rem] w-[3.625rem] border-[0.15625rem] border-primary'
            : 'h-12 w-12 border-2 border-hero-chip-border'
        )}
        style={first ? { boxShadow: glow({ blur: 22 }) } : undefined}
      >
        <Text
          className={cn('font-bold text-hero', first ? 'text-[1.3125rem]' : 'text-[1.0625rem]')}
        >
          {initialOf(name)}
        </Text>
      </View>
      {first ? (
        <View className="mb-[0.375rem]">
          <MaterialCommunityIcons
            name="crown"
            size={scale(18)}
            color={colors.warning}
            accessibilityLabel="Primeiro lugar"
          />
        </View>
      ) : null}
    </>
  );
}

function PodiumStep({ step, label }: { step: 1 | 2 | 3; label: string }) {
  const colors = useCores();
  return (
    <Vidro
      classeExterna="w-full rounded-b-none rounded-t-2xl"
      className={cn('items-center rounded-b-none rounded-t-2xl pt-2.5', STEP_HEIGHT[step])}
    >
      {step === 1 ? (
        <LinearGradient
          colors={[comOpacidade(colors.primary, 0.34), comOpacidade(colors.primary, 0.12)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.35, y: 1 }}
          className="absolute inset-0"
        />
      ) : null}
      <Text className="font-display-black text-[1.5rem] text-hero">{label}</Text>
    </Vidro>
  );
}
