import type { LucideIcon } from 'lucide-react-native';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import Utensils from 'lucide-react-native/icons/utensils';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCores, useEscala } from '@/shared/design';
import { Vidro } from '../Vidro';
import { type PushBannerIcon, type PushBannerTone, usePushBannerStore } from './store';

/**
 * Desenha o balão que estiver no topo da fila, sobre a tela atual — o "balão
 * sobre o app" do mock (telas 15–16 do DesignSync). Monta uma vez, na raiz,
 * ao lado do `AppAlertHost`.
 *
 * Só informa: toca em qualquer lugar do balão para fechar. Sem ação própria —
 * quem quiser agir sobre o que o balão mostra faz isso pela tela de sempre.
 */
export function PushBannerHost() {
  const current = usePushBannerStore((state) => state.current);
  const dismiss = usePushBannerStore((state) => state.dismiss);

  if (current === null) return null;

  return <Banner key={`${current.title}-${current.body}`} {...current} onDismiss={dismiss} />;
}

const ICONS: Record<PushBannerIcon, LucideIcon> = {
  'triangle-alert': TriangleAlert,
  utensils: Utensils,
  dumbbell: Dumbbell,
};

/** Mesma caixa "linha" do `CaixaDeIcone`: 2.5rem, ícone a 19. */
const ICON_SIZE = 19;

/** Classe literal por tom — Tailwind só gera o que aparece escrito no fonte. */
const HALO: Record<PushBannerTone, string> = {
  danger: 'bg-destructive/15 border-destructive/30',
  warning: 'bg-warning/15 border-warning/30',
  success: 'bg-success/15 border-success/30',
  info: 'bg-secondary/15 border-secondary/30',
};

/** Some sozinho depois de um tempo, como o balão nativo de push faria. */
const VISIBLE_DURATION_MS = 5000;
const ENTER_DURATION_MS = 220;
const EXIT_DURATION_MS = 160;

interface BannerProps {
  tone: PushBannerTone;
  icon: PushBannerIcon;
  title: string;
  body: string;
  onDismiss: () => void;
}

function Banner({ tone, icon, title, body, onDismiss }: BannerProps) {
  const cores = useCores();
  const escalar = useEscala();
  const inset = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-escalar(16));
  const Icon = ICONS[icon];

  // biome-ignore lint/correctness/useExhaustiveDependencies: dispara uma vez por balão — o host troca a `key` a cada balão novo, então isto nunca precisa reagir a `onDismiss`/`opacity`/`translateY` mudando.
  useEffect(() => {
    opacity.value = withTiming(1, { duration: ENTER_DURATION_MS });
    translateY.value = withSpring(0, { damping: 16 });

    const saida = setTimeout(() => {
      opacity.value = withTiming(0, { duration: EXIT_DURATION_MS });
      onDismiss();
    }, VISIBLE_DURATION_MS);

    return () => clearTimeout(saida);
  }, []);

  const estilo = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[estilo, { top: inset.top + escalar(8) }]}
      className="absolute left-3 right-3 z-50"
    >
      <Pressable onPress={onDismiss}>
        <Vidro forte className="flex-row items-center gap-3 p-3">
          <View
            className={`h-[2.5rem] w-[2.5rem] items-center justify-center rounded-[0.8125rem] border ${HALO[tone]}`}
          >
            <Icon size={escalar(ICON_SIZE)} color={colorForTone(tone, cores)} />
          </View>
          <View className="flex-1">
            <Text className="text-corpo font-bold text-foreground" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-legenda text-muted-foreground" numberOfLines={2}>
              {body}
            </Text>
          </View>
        </Vidro>
      </Pressable>
    </Animated.View>
  );
}

/** O ícone não aceita classe: precisa da cor já resolvida. */
function colorForTone(tone: PushBannerTone, cores: ReturnType<typeof useCores>): string {
  if (tone === 'danger') return cores.destructive;
  if (tone === 'success') return cores.success;
  if (tone === 'warning') return cores.warning;
  return cores.secondary;
}
