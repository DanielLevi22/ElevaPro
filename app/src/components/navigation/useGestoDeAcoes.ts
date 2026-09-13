import * as Haptics from 'expo-haptics';
import type { ViewStyle } from 'react-native';
import type { GestureType } from 'react-native-gesture-handler';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export type AcaoRapida = 'treino' | 'menu' | 'dieta' | 'cardio';

/** Até onde o dedo precisa ir para escolher um atalho. */
const LIMIAR_VERTICAL = -30;
const LIMIAR_HORIZONTAL = 40;
/** Abaixo disto o gesto conta como toque, e abre o menu. */
const RAIO_DO_TOQUE = 10;
/** O puxão magnético na direção do atalho escolhido. */
const IMA: Record<AcaoRapida, { x: number; y: number }> = {
  treino: { x: -12, y: -12 },
  menu: { x: 12, y: -12 },
  dieta: { x: -12, y: 12 },
  cardio: { x: 12, y: 12 },
};
const MOLA = { damping: 15, stiffness: 120 } as const;

function acaoNoPonto(x: number, y: number, comCardio: boolean): AcaoRapida | null {
  'worklet';
  if (y < LIMIAR_VERTICAL) return x < 0 ? 'treino' : 'menu';
  if (x < -LIMIAR_HORIZONTAL) return 'dieta';
  if (x > LIMIAR_HORIZONTAL && comCardio) return 'cardio';
  return null;
}

interface GestoDeAcoes {
  gesto: GestureType;
  /** O atalho sob o dedo, para os indicadores acenderem. */
  escolhida: SharedValue<AcaoRapida | null>;
  /** O botão acompanhando o dedo, com o puxão do ímã. */
  estiloDoBotao: ReturnType<typeof useEstiloDoBotao>;
}

/**
 * O arrasto do "+": escolhe o atalho pela direção, vibra ao trocar de atalho e
 * dispara a ação ao soltar — ou o menu, quando foi só um toque.
 *
 * Tudo aqui roda na thread de UI; só a vibração e `onAcao` voltam ao
 * JavaScript, por `runOnJS`.
 *
 * @example
 * const { gesto, escolhida, estiloDoBotao } = useGestoDeAcoes({ comCardio, arrastando, onAcao });
 * <GestureDetector gesture={gesto}><Animated.View style={estiloDoBotao} /></GestureDetector>
 */
export function useGestoDeAcoes({
  comCardio,
  arrastando,
  onAcao,
}: {
  comCardio: boolean;
  arrastando: SharedValue<number>;
  onAcao: (acao: AcaoRapida) => void;
}): GestoDeAcoes {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const escolhida = useSharedValue<AcaoRapida | null>(null);

  const gesto = Gesture.Pan()
    .onStart(() => {
      arrastando.value = 1;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((evento) => {
      const acao = acaoNoPonto(evento.translationX, evento.translationY, comCardio);
      if (acao && acao !== escolhida.value) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      }
      escolhida.value = acao;
      x.value = evento.translationX + (acao ? IMA[acao].x : 0);
      y.value = evento.translationY + (acao ? IMA[acao].y : 0);
    })
    .onEnd(() => {
      const acao = escolhida.value;
      if (acao || Math.hypot(x.value, y.value) < RAIO_DO_TOQUE) {
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(onAcao)(acao ?? 'menu');
      }
      x.value = withSpring(0, MOLA);
      y.value = withSpring(0, MOLA);
      escolhida.value = null;
    })
    .onFinalize(() => {
      arrastando.value = 0;
    });

  return { gesto, escolhida, estiloDoBotao: useEstiloDoBotao(x, y, arrastando) };
}

function useEstiloDoBotao(
  x: SharedValue<number>,
  y: SharedValue<number>,
  arrastando: SharedValue<number>
) {
  return useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: withSpring(arrastando.value ? 1.05 : 1) },
    ],
  }));
}
