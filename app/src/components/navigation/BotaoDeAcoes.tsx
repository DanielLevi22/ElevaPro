import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useCores, useEscala } from '@/shared/design';

/**
 * O "+" no meio da tab bar: tocar abre o menu; arrastar escolhe um atalho —
 * treino em cima à esquerda, menu em cima à direita, dieta à esquerda e, para o
 * aluno, cardio à direita.
 *
 * O kit não desenha este botão. Ele ficou por decisão de produto (#295), e
 * ganhou a pele do kit: lime com o brilho do `BotaoDeDestaque`, e os atalhos em
 * vidro que acendem na primária.
 *
 * @example
 * <BotaoDeAcoes comCardio={ehAluno} arrastando={arrastando} onAcao={executar} />
 */
export type AcaoRapida = 'treino' | 'menu' | 'dieta' | 'cardio';

interface BotaoDeAcoesProps {
  comCardio: boolean;
  /** 1 enquanto o dedo arrasta: a barra esmaece junto. */
  arrastando: SharedValue<number>;
  onAcao: (acao: AcaoRapida) => void;
}

/** Até onde o dedo precisa ir para escolher um atalho. */
const LIMIAR_VERTICAL = -30;
const LIMIAR_HORIZONTAL = 40;
/** O puxão magnético na direção do atalho escolhido. */
const IMA = 12;
const LADO = 60;
const TAMANHO_DO_MAIS = 32;
const MOLA = { damping: 15, stiffness: 120 } as const;

function acaoNoPonto(x: number, y: number, comCardio: boolean): AcaoRapida | null {
  'worklet';
  if (y < LIMIAR_VERTICAL) return x < 0 ? 'treino' : 'menu';
  if (x < -LIMIAR_HORIZONTAL) return 'dieta';
  if (x > LIMIAR_HORIZONTAL && comCardio) return 'cardio';
  return null;
}

export function BotaoDeAcoes({ comCardio, arrastando, onAcao }: BotaoDeAcoesProps) {
  const cores = useCores();
  const escalar = useEscala();
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
      if (acao !== escolhida.value && acao) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      }
      escolhida.value = acao;
      x.value =
        evento.translationX + (acao === 'menu' || acao === 'cardio' ? IMA : acao ? -IMA : 0);
      y.value =
        evento.translationY + (acao === 'treino' || acao === 'menu' ? -IMA : acao ? IMA : 0);
    })
    .onEnd(() => {
      const acao = escolhida.value;
      const tocou = Math.hypot(x.value, y.value) < 10;
      if (acao || tocou) {
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

  const estiloDoBotao = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: withSpring(arrastando.value ? 1.05 : 1) },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      className="-mt-7 h-[4.25rem] w-[4.25rem] items-center justify-center"
    >
      <View pointerEvents="box-none" className="absolute">
        <IndicadorDeAcao
          acao="treino"
          icone="dumbbell"
          rotulo="Treino"
          x={-60}
          y={-80}
          escolhida={escolhida}
          arrastando={arrastando}
        />
        <IndicadorDeAcao
          acao="menu"
          icone="view-grid"
          rotulo="Menu"
          x={60}
          y={-80}
          escolhida={escolhida}
          arrastando={arrastando}
        />
        <IndicadorDeAcao
          acao="dieta"
          icone="food-apple"
          rotulo="Dieta"
          x={-100}
          y={-10}
          escolhida={escolhida}
          arrastando={arrastando}
        />
        {comCardio ? (
          <IndicadorDeAcao
            acao="cardio"
            icone="run"
            rotulo="Cardio"
            x={100}
            y={-10}
            escolhida={escolhida}
            arrastando={arrastando}
          />
        ) : null}
      </View>

      <GestureDetector gesture={gesto}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ações rápidas"
          accessibilityHint="Toque para abrir o menu, ou arraste para treino, dieta ou cardio"
          className="items-center justify-center rounded-full bg-primary"
          style={[
            {
              width: escalar(LADO),
              height: escalar(LADO),
              boxShadow: [
                {
                  offsetX: 0,
                  offsetY: escalar(10),
                  blurRadius: escalar(26),
                  spreadDistance: escalar(-8),
                  color: cores.primary,
                },
              ],
            },
            estiloDoBotao,
          ]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={escalar(TAMANHO_DO_MAIS)}
            color={cores.primaryForeground}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

interface IndicadorDeAcaoProps {
  acao: AcaoRapida;
  icone: keyof typeof MaterialCommunityIcons.glyphMap;
  rotulo: string;
  /** Posição no desenho, a partir do centro do botão. */
  x: number;
  y: number;
  escolhida: SharedValue<AcaoRapida | null>;
  arrastando: SharedValue<number>;
}

const LADO_DO_INDICADOR = 44;
const TAMANHO_DO_ICONE = 20;
const SUBIDA_DO_ROTULO = -25;

/**
 * Um atalho: vidro enquanto o dedo arrasta, primária e maior quando escolhido.
 * O ícone troca de cor por dois ícones sobrepostos — cor de ícone não anima.
 */
function IndicadorDeAcao({
  acao,
  icone,
  rotulo,
  x,
  y,
  escolhida,
  arrastando,
}: IndicadorDeAcaoProps) {
  const cores = useCores();
  const escalar = useEscala();
  const lado = escalar(LADO_DO_INDICADOR);

  const estiloDoCirculo = useAnimatedStyle(() => {
    const ativo = escolhida.value === acao;
    return {
      opacity: ativo ? 1 : withSpring(arrastando.value ? 1 : 0, { damping: 20 }),
      backgroundColor: withSpring(ativo ? cores.primary : cores.card),
      borderColor: ativo ? cores.primary : cores.glassBorder,
      transform: [{ scale: withSpring(ativo ? 1.6 : 1) }],
      zIndex: ativo ? 2 : 1,
    };
  });
  const estiloDoAceso = useAnimatedStyle(() => ({ opacity: escolhida.value === acao ? 1 : 0 }));
  const estiloDoRotulo = useAnimatedStyle(() => {
    const ativo = escolhida.value === acao;
    return {
      opacity: withSpring(ativo ? 1 : 0),
      transform: [{ translateY: withSpring(ativo ? escalar(SUBIDA_DO_ROTULO) : 0) }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute items-center justify-center rounded-full border"
      style={[
        { width: lado, height: lado, left: escalar(x) - lado / 2, top: escalar(y) },
        estiloDoCirculo,
      ]}
    >
      <MaterialCommunityIcons
        name={icone}
        size={escalar(TAMANHO_DO_ICONE)}
        color={cores.foreground}
      />
      <Animated.View className="absolute" style={estiloDoAceso}>
        <MaterialCommunityIcons
          name={icone}
          size={escalar(TAMANHO_DO_ICONE)}
          color={cores.primaryForeground}
        />
      </Animated.View>
      <Animated.Text
        className="absolute w-20 text-center text-[0.625rem] font-bold uppercase tracking-wide text-foreground"
        style={estiloDoRotulo}
      >
        {rotulo}
      </Animated.Text>
    </Animated.View>
  );
}
