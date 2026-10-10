import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

export type WaitStepState = 'done' | 'current' | 'next' | 'stopped';

interface WaitStepProps {
  label: string;
  state: WaitStepState;
}

const ICON_SIZE = 14;
const STATE_ICON: Record<WaitStepState, keyof typeof Ionicons.glyphMap | null> = {
  done: 'checkmark',
  current: 'sync',
  next: null,
  stopped: 'close',
};
const ICON_COLOR = {
  done: 'primaryForeground',
  current: 'primaryText',
  next: 'primaryText',
  stopped: 'destructive',
} as const satisfies Record<WaitStepState, string>;
const BADGE: Record<WaitStepState, string> = {
  done: 'Feito',
  current: 'Agora',
  next: 'A seguir',
  stopped: 'Parou',
};

/**
 * Um passo da tela de espera do kit (`PassoDeEspera` no desenho): o círculo
 * com o estado, o nome do passo e o selo em mono à direita.
 *
 * @example <WaitStep label="Montando sua semana de treino" state="current" />
 */
export function WaitStep({ label, state }: WaitStepProps) {
  const cores = useCores();
  const escalar = useEscala();
  const icon = STATE_ICON[state];

  return (
    <View className="flex-row items-center gap-3 border-t border-glass-border py-3">
      <View
        className={cn(
          'h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full',
          state === 'done' && 'bg-primary',
          state === 'current' && 'border border-primary',
          state === 'stopped' && 'border border-destructive bg-destructive/15',
          state === 'next' && 'border border-glass-border'
        )}
      >
        {icon ? (
          <Spinning active={state === 'current'}>
            <Ionicons name={icon} size={escalar(ICON_SIZE)} color={cores[ICON_COLOR[state]]} />
          </Spinning>
        ) : null}
      </View>
      <Text
        className={cn(
          'flex-1 text-sm',
          state === 'next' ? 'font-medium text-placeholder' : 'font-bold text-hero'
        )}
      >
        {label}
      </Text>
      <Text
        className={cn(
          'font-mono text-[0.5625rem] font-bold uppercase tracking-[0.14em]',
          state === 'next' ? 'text-placeholder' : 'text-hero-secondary'
        )}
      >
        {BADGE[state]}
      </Text>
    </View>
  );
}

export type { WaitStepProps };

const TURN_MS = 1200;

/** O ícone de "Agora" gira: o passo está acontecendo. Parado com "reduzir movimento". */
function Spinning({ active, children }: { active: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const angle = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) return;
    angle.value = withRepeat(withTiming(360, { duration: TURN_MS, easing: Easing.linear }), -1);
  }, [active, reduceMotion, angle]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
