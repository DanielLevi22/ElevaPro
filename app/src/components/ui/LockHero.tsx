import { LinearGradient } from 'expo-linear-gradient';
import { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  Path,
  RadialGradient,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import { comOpacidade, illustration, mixColors, useCores, useEscala } from '@/shared/design';

/**
 * O cadeado do kit (`LockObject` do `hero-objects.js`): o arco de aço e o corpo na
 * cor de destaque, com o reflexo em cima e o buraco da chave. É o objeto das telas
 * de consentimento e privacidade.
 *
 * Cada peça é a do CSS do kit, na mesma medida; o `transform: scale()` vira medida
 * multiplicada, e o `rotate(-5deg)` fica no conjunto.
 *
 * O arco é SVG: no kit ele é uma borda de 15px com cor diferente no topo e nas
 * laterais sobre um raio de 99, e o Android não desenha borda de cor por lado com
 * raio de forma confiável.
 *
 * @example
 * <Pedestal size={104} lift={4}><LockHero scale={0.56} /></Pedestal>
 * <Pedestal size={142} lift={4} glow={cores.perigo}><LockHero scale={0.72} accent={cores.perigo} /></Pedestal>
 */
interface LockHeroProps {
  scale?: number;
  /** A cor do corpo. A primária, se omitida. Precisa ser `#rrggbb`. */
  accent?: string;
}

type Measure = (designUnits: number) => number;

/** A sombra do corpo (`0 18px 32px`) cabe nesta folga. */
const SHADOW_ROOM = 52;
const SHACKLE = { side: 74, stroke: 15, overlap: 10 } as const;
const BODY = { width: 132, height: 104, radius: 26 } as const;

export function LockHero({ scale = 1, accent }: LockHeroProps) {
  const cores = useCores();
  const escalar = useEscala();
  const measure: Measure = (units) => escalar(units) * scale;
  const color = accent ?? cores.primary;

  // Como no relógio: no Android o `boxShadow` de um filho é recortado na borda do
  // pai, e a margem negativa devolve a folga ao layout.
  const room = measure(SHADOW_ROOM);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center"
      style={{ padding: room, margin: -room, transform: [{ rotate: '-5deg' }] }}
    >
      <Shackle measure={measure} />
      <Body measure={measure} color={color} />
    </View>
  );
}

/** O arco: meia-volta de 15 de espessura, clara no topo e mais escura nas laterais. */
function Shackle({ measure }: { measure: Measure }) {
  const id = `arco${useId().replace(/:/g, '')}`;
  const side = measure(SHACKLE.side);
  const stroke = measure(SHACKLE.stroke);
  const radius = side / 2 - stroke / 2;
  const left = stroke / 2;
  const right = side - stroke / 2;
  const center = side / 2;

  return (
    <View style={{ width: side, height: side, marginBottom: -measure(SHACKLE.overlap) }}>
      <Svg width={side} height={side}>
        <Defs>
          <SvgLinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor={illustration.shackleTop} />
            <Stop offset={0.5} stopColor={illustration.shackleSide} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={`M ${left} ${side} L ${left} ${center} A ${radius} ${radius} 0 0 1 ${right} ${center} L ${right} ${side}`}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          fill="none"
        />
        {/* O `inset 0 2px 0` branco do kit: o fio de luz na borda de fora do topo. */}
        <Path
          d={`M ${measure(1)} ${center} A ${center - measure(1)} ${center - measure(1)} 0 0 1 ${side - measure(1)} ${center}`}
          stroke={illustration.white}
          strokeOpacity={0.9}
          strokeWidth={measure(2)}
          fill="none"
        />
      </Svg>
    </View>
  );
}

/**
 * O corpo: `linear-gradient(150deg, …)` da cor clareada à escurecida, com a sombra
 * de palco, o fio de luz em cima e a sombra de dentro embaixo.
 */
function Body({ measure, color }: { measure: Measure; color: string }) {
  return (
    <View
      className="items-center justify-center"
      style={{
        width: measure(BODY.width),
        height: measure(BODY.height),
        borderRadius: measure(BODY.radius),
        boxShadow: [
          {
            offsetX: 0,
            offsetY: measure(18),
            blurRadius: measure(32),
            color: comOpacidade(illustration.stageShadow, 0.5),
          },
        ],
      }}
    >
      <View
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: measure(BODY.radius),
          boxShadow: [
            {
              offsetX: 0,
              offsetY: measure(2),
              blurRadius: 0,
              color: comOpacidade(illustration.white, 0.55),
              inset: true,
            },
            {
              offsetX: 0,
              offsetY: -measure(10),
              blurRadius: measure(18),
              color: comOpacidade(illustration.stageShadow, 0.28),
              inset: true,
            },
          ],
        }}
      >
        <LinearGradient
          colors={[
            mixColors(color, illustration.white, 0.68),
            color,
            mixColors(color, illustration.black, 0.78),
            mixColors(color, illustration.black, 0.55),
          ]}
          locations={[0, 0.34, 0.72, 1]}
          start={{ x: 0.25, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          className="absolute inset-0"
        />
        <Glare measure={measure} />
      </View>
      <Keyhole measure={measure} />
    </View>
  );
}

/**
 * O reflexo: a pílula branca a 30% com `blur(7px)`. Sem filtro no Android, vira um
 * radial elíptico que some na borda, na mesma caixa aumentada pelo alcance do blur.
 */
function Glare({ measure }: { measure: Measure }) {
  const id = `reflexo${useId().replace(/:/g, '')}`;
  const blur = measure(7);
  return (
    <View
      className="absolute"
      style={{
        top: measure(9) - blur,
        left: measure(14) - blur,
        right: measure(40) - blur,
        height: measure(26) + blur * 2,
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset={0} stopColor={illustration.white} stopOpacity={0.3} />
            <Stop offset={0.55} stopColor={illustration.white} stopOpacity={0.24} />
            <Stop offset={1} stopColor={illustration.white} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** O buraco da chave: o círculo e a haste, pretos a 55%. */
function Keyhole({ measure }: { measure: Measure }) {
  const hole = comOpacidade(illustration.black, 0.55);
  return (
    <View
      className="rounded-full"
      style={{
        width: measure(22),
        height: measure(22),
        backgroundColor: hole,
        boxShadow: [
          {
            offsetX: 0,
            offsetY: measure(2),
            blurRadius: measure(4),
            color: comOpacidade(illustration.black, 0.7),
            inset: true,
          },
        ],
      }}
    >
      <View
        className="absolute"
        style={{
          left: measure(7),
          top: measure(18),
          width: measure(8),
          height: measure(18),
          borderBottomLeftRadius: measure(4),
          borderBottomRightRadius: measure(4),
          backgroundColor: hole,
        }}
      />
    </View>
  );
}

export type { LockHeroProps };
