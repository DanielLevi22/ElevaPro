import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useId } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { cn } from '@/lib/utils';
import { comOpacidade, illustration, mixColors, useCores, useEscala } from '@/shared/design';

/**
 * O relógio esportivo do kit (`WatchObject` do `hero-objects.js`), em 3/4: a
 * pulseira de silicone na primária, a caixa de aço, a coroa e a tela apagada com o
 * anel aceso.
 *
 * Cada peça é a do CSS do kit, na mesma medida. O `transform: scale()` vira medida
 * multiplicada, e o `rotate(-7deg)` fica no conjunto.
 *
 * @example <Pedestal size={210} lift={8}><WatchHero scale={0.84} /></Pedestal>
 */
interface WatchHeroProps {
  scale?: number;
}

type Measure = (designUnits: number) => number;

/** O `rgba(255,255,255,.14)` das bordas do anel que não acendem. */
const RING_UNLIT = 0.14;
/** A sombra da caixa (`0 16px 30px`) cabe nesta folga. */
const SHADOW_ROOM = 48;

export function WatchHero({ scale = 1 }: WatchHeroProps) {
  const escalar = useEscala();
  const measure: Measure = (units) => escalar(units) * scale;

  // A folga é onde a sombra da caixa e o brilho do anel moram: no Android o
  // `boxShadow` de um filho é recortado na borda do pai. A margem negativa devolve o
  // espaço ao layout.
  const room = measure(SHADOW_ROOM);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center"
      style={{ padding: room, margin: -room, transform: [{ rotate: '-7deg' }] }}
    >
      <Band measure={measure} position="top" />
      <Case measure={measure} />
      <Band measure={measure} position="bottom" />
    </View>
  );
}

/**
 * A pulseira: `linear-gradient(100deg, …)` da primária escurecida ao brilho e de
 * volta, com a sombra de dentro que dá o volume do silicone.
 */
function Band({ measure, position }: { measure: Measure; position: 'top' | 'bottom' }) {
  const cores = useCores();
  const accent = cores.primary;
  const top = position === 'top';
  const radius = top
    ? {
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      }
    : {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
      };
  const scaled = Object.fromEntries(
    Object.entries(radius).map(([corner, value]) => [corner, measure(value)])
  ) as ViewStyle;

  return (
    <View
      className="overflow-hidden"
      style={{
        width: measure(74),
        height: measure(top ? 64 : 70),
        ...scaled,
        boxShadow: [
          {
            offsetX: 0,
            offsetY: measure(top ? -8 : 8),
            blurRadius: measure(14),
            color: comOpacidade(illustration.stageShadow, 0.35),
            inset: true,
          },
        ],
      }}
    >
      <LinearGradient
        colors={[
          mixColors(accent, illustration.black, 0.88),
          accent,
          mixColors(accent, illustration.white, 0.72),
          mixColors(accent, illustration.black, 0.8),
        ]}
        locations={[0, 0.42, 0.6, 1]}
        start={{ x: 0, y: 0.41 }}
        end={{ x: 1, y: 0.59 }}
        className="absolute inset-0"
      />
      <View
        className={cn('absolute left-0 right-0', top ? 'top-0' : 'bottom-0')}
        style={{
          height: measure(2),
          backgroundColor: comOpacidade(illustration.white, top ? 0.35 : 0.2),
        }}
      />
    </View>
  );
}

function Case({ measure }: { measure: Measure }) {
  return (
    <View
      style={{
        width: measure(104),
        height: measure(124),
        // Com o raio no invólucro, a sombra segue a caixa; sem ele, o Android a
        // desenhava num retângulo claro atrás do relógio.
        borderRadius: measure(32),
        marginVertical: -measure(10),
        zIndex: 2,
        boxShadow: [
          {
            offsetX: 0,
            offsetY: measure(16),
            blurRadius: measure(30),
            color: comOpacidade(illustration.stageShadow, 0.5),
          },
        ],
      }}
    >
      <Crown
        measure={measure}
        top={34}
        width={8}
        height={20}
        right={-6}
        colors={[illustration.metalHighlight, illustration.crownShade]}
      />
      <Crown
        measure={measure}
        top={62}
        width={6}
        height={26}
        right={-5}
        colors={[illustration.crownLight, illustration.crownDeep]}
      />
      <Clipped radius={measure(32)}>
        <LinearGradient
          colors={[
            illustration.steelBright,
            illustration.steelSoft,
            illustration.steelDeep,
            illustration.steelPale,
            illustration.steelMuted,
          ]}
          locations={[0, 0.26, 0.52, 0.78, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          className="absolute inset-0"
        />
        <View
          className="absolute left-0 right-0 top-0"
          style={{ height: 1, backgroundColor: comOpacidade(illustration.white, 0.85) }}
        />
        <View
          className="absolute"
          style={{ top: measure(7), left: measure(7), right: measure(7), bottom: measure(7) }}
        >
          <Screen measure={measure} />
        </View>
      </Clipped>
    </View>
  );
}

function Clipped({ radius, children }: { radius: number; children: ReactNode }) {
  return (
    <View className="absolute inset-0 overflow-hidden" style={{ borderRadius: radius }}>
      {children}
    </View>
  );
}

function Crown({
  measure,
  top,
  width,
  height,
  right,
  colors,
}: {
  measure: Measure;
  top: number;
  width: number;
  height: number;
  right: number;
  colors: readonly [string, string];
}) {
  return (
    <View
      className="absolute overflow-hidden"
      style={{
        top: measure(top),
        right: measure(right),
        width: measure(width),
        height: measure(height),
        borderRadius: measure(3),
      }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="absolute inset-0"
      />
    </View>
  );
}

/** A tela apagada: o radial escuro, o reflexo em diagonal, o anel aceso e a hora. */
function Screen({ measure }: { measure: Measure }) {
  const cores = useCores();
  const id = `relogio${useId().replace(/:/g, '')}`;
  const now = new Date();
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <View
      className="flex-1 items-center justify-center overflow-hidden"
      style={{ borderRadius: measure(26) }}
    >
      <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <RadialGradient id={id} cx="20%" cy="8%" rx="120%" ry="90%" fx="20%" fy="8%">
            <Stop offset={0} stopColor={illustration.screenLit} />
            <Stop offset={0.6} stopColor={illustration.screenOff} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <LinearGradient
        colors={[
          comOpacidade(illustration.white, 0.22),
          comOpacidade(illustration.white, 0),
          comOpacidade(illustration.white, 0),
          comOpacidade(illustration.white, 0.08),
        ]}
        locations={[0, 0.34, 0.66, 1]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        className="absolute inset-0"
      />
      <View
        className="rounded-full"
        style={{
          width: measure(52),
          height: measure(52),
          borderWidth: measure(5),
          borderColor: cores.primary,
          borderRightColor: comOpacidade(illustration.white, RING_UNLIT),
          borderBottomColor: comOpacidade(illustration.white, RING_UNLIT),
          transform: [{ rotate: '28deg' }],
          boxShadow: [
            {
              offsetX: 0,
              offsetY: 0,
              blurRadius: measure(16),
              color: comOpacidade(cores.primary, 0.6),
            },
          ],
        }}
      />
      <Text
        className="absolute font-extrabold tracking-widest"
        style={{
          bottom: measure(16),
          fontSize: measure(9),
          color: comOpacidade(illustration.white, 0.62),
        }}
      >
        {time}
      </Text>
    </View>
  );
}

export type { WatchHeroProps };
