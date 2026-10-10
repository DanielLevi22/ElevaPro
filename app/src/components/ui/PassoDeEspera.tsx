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

export type EstadoDoPasso = 'feito' | 'agora' | 'a_seguir' | 'parou';

interface PassoDeEsperaProps {
  rotulo: string;
  estado: EstadoDoPasso;
}

const ICONE = 14;
const ICONE_DO_ESTADO: Record<EstadoDoPasso, keyof typeof Ionicons.glyphMap | null> = {
  feito: 'checkmark',
  agora: 'sync',
  a_seguir: null,
  parou: 'close',
};
const COR_DO_ICONE = {
  feito: 'primaryForeground',
  agora: 'primaryText',
  a_seguir: 'primaryText',
  parou: 'destructive',
} as const satisfies Record<EstadoDoPasso, string>;
const SELO: Record<EstadoDoPasso, string> = {
  feito: 'Feito',
  agora: 'Agora',
  a_seguir: 'A seguir',
  parou: 'Parou',
};

/**
 * Um passo da tela de espera do kit (`PassoDeEspera`): o círculo com o estado,
 * o nome do passo e o selo em mono à direita.
 *
 * @example <PassoDeEspera rotulo="Montando sua semana de treino" estado="agora" />
 */
export function PassoDeEspera({ rotulo, estado }: PassoDeEsperaProps) {
  const cores = useCores();
  const escalar = useEscala();
  const icone = ICONE_DO_ESTADO[estado];
  const corDoIcone = cores[COR_DO_ICONE[estado]];

  return (
    <View className="flex-row items-center gap-3 border-t border-glass-border py-3">
      <View
        className={cn(
          'h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full',
          estado === 'feito' && 'bg-primary',
          estado === 'agora' && 'border border-primary',
          estado === 'parou' && 'border border-destructive bg-destructive/15',
          estado === 'a_seguir' && 'border border-glass-border'
        )}
      >
        {icone ? (
          <Girando ativo={estado === 'agora'}>
            <Ionicons name={icone} size={escalar(ICONE)} color={corDoIcone} />
          </Girando>
        ) : null}
      </View>
      <Text
        className={cn(
          'flex-1 text-sm',
          estado === 'a_seguir' ? 'font-medium text-placeholder' : 'font-bold text-hero'
        )}
      >
        {rotulo}
      </Text>
      <Text
        className={cn(
          'font-mono text-[0.5625rem] font-bold uppercase tracking-[0.14em]',
          estado === 'a_seguir' ? 'text-placeholder' : 'text-hero-secondary'
        )}
      >
        {SELO[estado]}
      </Text>
    </View>
  );
}

export type { PassoDeEsperaProps };

const VOLTA_MS = 1200;

/** O ícone de "Agora" gira: o passo está acontecendo. Parado com "reduzir movimento". */
function Girando({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  const reduzir = useReducedMotion();
  const angulo = useSharedValue(0);
  useEffect(() => {
    if (!ativo || reduzir) return;
    angulo.value = withRepeat(withTiming(360, { duration: VOLTA_MS, easing: Easing.linear }), -1);
  }, [ativo, reduzir, angulo]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ rotate: `${angulo.value}deg` }] }));
  return <Animated.View style={estilo}>{children}</Animated.View>;
}
