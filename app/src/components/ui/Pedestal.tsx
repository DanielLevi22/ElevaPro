import { type ReactNode, useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { illustration, useCores, useEscala } from '@/shared/design';

/**
 * O palco dos objetos-herói do kit: a luz da primária no chão, a sombra de
 * contato e a elipse tracejada, com o objeto flutuando por cima.
 *
 * No CSS do kit (`hero-objects.js`) são três elipses com `filter: blur()`:
 *
 *     luz:     95% × 62% do lado, bottom 6%,  radial primária/.38 até 72%, blur(16px)
 *     sombra:  52% × 9%,          bottom 14%, preto/.55,                    blur(10px)
 *     tracejo: 60% × 11%,         bottom 13%, 1px dashed primária/.55,      opacity .8
 *
 * Como na `BrilhoAmbiente`, o que está aqui é **o resultado do blur**: cada
 * elipse foi rasterizada no lado de 212 (o do cardio), convoluída com a
 * gaussiana e medida nos dois eixos.
 *
 * - a luz: pico a 64,7%, alcance de 1% a 93 na horizontal e 73 na vertical, e os
 *   perfis dos dois eixos coincidem a menos de 0,07 — um radial elíptico basta;
 * - a sombra é elipse chapada, e o blur a deixa com platô na horizontal e ponta
 *   na vertical: os perfis diferem 0,41. Um radial só erraria a forma, então ela
 *   é o produto dos dois perfis — gradiente horizontal com máscara vertical.
 *
 * @example
 * <Pedestal size={212} lift={6}><CardioHero kind="bike" scale={0.96} /></Pedestal>
 */
interface PedestalProps {
  /** Lado do palco no desenho. */
  size?: number;
  /** Quanto o objeto sobe acima do chão, no desenho. */
  lift?: number;
  /** A cor da luz e do tracejo no chão (`glow` do kit). A primária, se omitida. */
  glow?: string;
  children: ReactNode;
}

type Profile = readonly number[];

const GLOW = {
  centerFromBottom: 0.37,
  reachX: 93 / 212,
  reachY: 73 / 212,
  peak: 0.38 * 0.647,
  profile: [1, 0.965, 0.859, 0.723, 0.568, 0.393, 0.256, 0.147, 0.074, 0.028, 0],
} as const;

const SHADOW = {
  centerFromBottom: 0.185,
  reachX: 75 / 212,
  reachY: 34 / 212,
  peak: 0.55 * 0.652,
  profileX: [1, 0.989, 0.965, 0.919, 0.853, 0.726, 0.558, 0.326, 0.153, 0.042, 0],
  profileY: [1, 0.957, 0.813, 0.664, 0.455, 0.316, 0.203, 0.1, 0.054, 0.021, 0],
} as const;

const RING = { bottom: 0.13, width: 0.6, height: 0.11, alpha: 0.55 * 0.8 } as const;
/** O `dashed` de 1px do navegador: traço e vão de 3. */
const RING_DASH = '3 3';

/*
 * O `drop-shadow(0 18px 26px)` que o kit põe no objeto não entrou. No Android o
 * `filter` desenha o objeto numa camada do tamanho da caixa dele e recorta o que
 * passa da borda — o halo verde das rodas saía cortado num retângulo. A sombra
 * de contato do chão já assenta o objeto, e o iOS nem tem esse filtro.
 */

export function Pedestal({ size = 230, lift = 0, glow, children }: PedestalProps) {
  const escalar = useEscala();
  const cores = useCores();
  const side = escalar(size);
  const color = glow ?? cores.primary;

  return (
    <View
      className="w-full items-center justify-center"
      style={{ height: side }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <FloorGlow side={side} color={color} />
      <ContactShadow side={side} />
      <DashedRing side={side} color={color} />
      <View style={{ transform: [{ translateY: -escalar(lift) }] }}>{children}</View>
    </View>
  );
}

/**
 * Paradas simétricas de um perfil medido do centro para a borda, para um
 * gradiente que atravessa a elipse de uma borda à outra.
 */
function mirroredStops(profile: Profile): { offset: number; value: number }[] {
  const steps = profile.length - 1;
  const half = profile.map((value, index) => ({ offset: 0.5 + (0.5 * index) / steps, value }));
  const mirrored = half
    .slice(1)
    .map(({ offset, value }) => ({ offset: 1 - offset, value }))
    .reverse();
  return [...mirrored, ...half];
}

/** `useId` devolve ":r0:", e dois-pontos quebram a referência `url(#…)`. */
function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/:/g, '')}`;
}

function FloorGlow({ side, color }: { side: number; color: string }) {
  const id = useSvgId('pedestalGlow');
  const width = side * GLOW.reachX * 2;
  const height = side * GLOW.reachY * 2;

  return (
    <View
      className="absolute"
      style={{ width, height, bottom: side * GLOW.centerFromBottom - height / 2 }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            {GLOW.profile.map((fraction, index) => (
              <Stop
                key={fraction}
                offset={index / (GLOW.profile.length - 1)}
                stopColor={color}
                stopOpacity={GLOW.peak * fraction}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function ContactShadow({ side }: { side: number }) {
  const id = useSvgId('shadow');
  const width = side * SHADOW.reachX * 2;
  const height = side * SHADOW.reachY * 2;

  return (
    <View
      className="absolute"
      style={{ width, height, bottom: side * SHADOW.centerFromBottom - height / 2 }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`${id}x`} x1="0" y1="0" x2="1" y2="0">
            {mirroredStops(SHADOW.profileX).map(({ offset, value }) => (
              <Stop
                key={offset}
                offset={offset}
                stopColor={illustration.stageShadow}
                stopOpacity={SHADOW.peak * value}
              />
            ))}
          </LinearGradient>
          <LinearGradient id={`${id}y`} x1="0" y1="0" x2="0" y2="1">
            {mirroredStops(SHADOW.profileY).map(({ offset, value }) => (
              <Stop key={offset} offset={offset} stopColor="white" stopOpacity={value} />
            ))}
          </LinearGradient>
          <Mask id={`${id}mask`}>
            <Rect width="100%" height="100%" fill={`url(#${id}y)`} />
          </Mask>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}x)`} mask={`url(#${id}mask)`} />
      </Svg>
    </View>
  );
}

function DashedRing({ side, color }: { side: number; color: string }) {
  const width = side * RING.width;
  const height = side * RING.height;

  return (
    <View className="absolute" style={{ width, height, bottom: side * RING.bottom }}>
      <Svg width="100%" height="100%">
        <Ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2 - 0.5}
          ry={height / 2 - 0.5}
          fill="none"
          stroke={color}
          strokeOpacity={RING.alpha}
          strokeWidth={1}
          strokeDasharray={RING_DASH}
        />
      </Svg>
    </View>
  );
}

export type { PedestalProps };
