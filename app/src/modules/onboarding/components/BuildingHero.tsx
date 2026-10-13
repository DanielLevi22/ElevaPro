import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useBrilho, useCores, useEscala } from '@/shared/design';

const LADO = 132;
const TRACO = 8;
const VOLTA_MS = 1400;
const FRASE_MS = 3500;
const ICONE = 34;
/** Um quarto do anel aceso: o arco que gira. */
const ARCO = 0.25;

/**
 * O que o plano faz por baixo, dito enquanto ele é montado. São fatos sobre o
 * plano, e não etapas: a rota responde de uma vez, e acender etapas em
 * sequência seria fingir saber em que parte ela está.
 */
const FRASES = [
  'Sua meta vem de uma fórmula, não da IA.',
  'Nada do que você disse que não come entra no plano.',
  'O treino cabe no tempo que você tem.',
  'Você revisa e aprova antes de qualquer coisa ser salva.',
];

/**
 * O topo de O8: um anel girando em volta das faíscas, e uma frase sobre o plano
 * que troca a cada poucos segundos. Mostra que está trabalhando sem inventar
 * progresso. Com "reduzir movimento" ligado, nada gira e a frase não troca.
 *
 * @example <BuildingHero />
 */
export function BuildingHero() {
  const cores = useCores();
  const escalar = useEscala();
  const comBrilho = useBrilho();
  const reduzir = useReducedMotion();
  const frase = useFraseQueTroca(reduzir);
  const giro = useGiro(reduzir);

  const lado = escalar(LADO);
  const raio = (LADO - TRACO) / 2;
  const volta = 2 * Math.PI * raio;

  return (
    <View className="mt-6 items-center">
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: lado,
          height: lado,
          boxShadow: comBrilho({ y: 0, blur: 40, espalhamento: -6 }),
        }}
      >
        <Animated.View style={[{ position: 'absolute', width: lado, height: lado }, giro]}>
          <Svg width={lado} height={lado} viewBox={`0 0 ${LADO} ${LADO}`}>
            <Circle
              cx={LADO / 2}
              cy={LADO / 2}
              r={raio}
              stroke={cores.glassStrong}
              strokeWidth={TRACO}
              fill="none"
            />
            <Circle
              cx={LADO / 2}
              cy={LADO / 2}
              r={raio}
              stroke={cores.primary}
              strokeWidth={TRACO}
              strokeLinecap="round"
              strokeDasharray={`${volta * ARCO} ${volta}`}
              fill="none"
            />
          </Svg>
        </Animated.View>
        <Ionicons name="sparkles" size={escalar(ICONE)} color={cores.primaryText} />
      </View>
      <View className="mt-5 min-h-10 justify-center px-6">
        <Animated.View
          key={frase}
          entering={reduzir ? undefined : FadeIn.duration(400)}
          exiting={reduzir ? undefined : FadeOut.duration(300)}
        >
          <Text
            accessibilityLiveRegion="polite"
            className="text-center text-[0.84375rem] leading-[1.2rem] text-hero-secondary"
          >
            {FRASES[frase]}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

/** O arco girando sem parar; parado com "reduzir movimento". */
function useGiro(reduzir: boolean) {
  const angulo = useSharedValue(0);
  useEffect(() => {
    if (reduzir) return;
    angulo.value = withRepeat(withTiming(360, { duration: VOLTA_MS, easing: Easing.linear }), -1);
  }, [angulo, reduzir]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${angulo.value}deg` }] }));
}

/** O índice da frase da vez, trocando a cada 3,5 s; fixo com "reduzir movimento". */
function useFraseQueTroca(reduzir: boolean): number {
  const [indice, setIndice] = useState(0);
  useEffect(() => {
    if (reduzir) return;
    const timer = setInterval(() => setIndice((atual) => (atual + 1) % FRASES.length), FRASE_MS);
    return () => clearInterval(timer);
  }, [reduzir]);
  return indice;
}
