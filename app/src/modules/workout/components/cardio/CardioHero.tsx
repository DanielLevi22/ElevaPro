import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useId } from 'react';
import { type BoxShadowValue, View, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';
import { cn } from '@/lib/utils';
import { comOpacidade, illustration, mixColors, useCores, useEscala } from '@/shared/design';
import type { CardioHeroKind } from '../../cardioModalities';

/**
 * O objeto do palco do cardio (`CardioObject` do kit): a bicicleta em arcos, a
 * esteira com painel ou as raias da natação, com o halo da primária.
 *
 * O kit desenha tudo em CSS dentro de uma caixa de 230 × 150, e cada peça aqui
 * é a mesma caixa, na mesma posição, com o mesmo gradiente. O `transform:
 * scale()` do kit vira medida multiplicada: a caixa encolhe junto e continua
 * centrada no palco.
 *
 * @example
 * <Pedestal size={212} lift={6}><CardioHero kind="bike" scale={0.96} /></Pedestal>
 */
interface CardioHeroProps {
  kind: CardioHeroKind;
  scale?: number;
}

type Measure = (designUnits: number) => number;

const BOX = { width: 230, height: 150 } as const;
const HORIZONTAL = { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } } as const;
const VERTICAL = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } } as const;

export function CardioHero({ kind, scale = 1 }: CardioHeroProps) {
  const escalar = useEscala();
  const measure: Measure = (units) => escalar(units) * scale;

  return (
    <View
      className="items-center justify-center"
      style={{ width: measure(BOX.width), height: measure(BOX.height) }}
    >
      {kind === 'bike' ? <Bike measure={measure} /> : null}
      {kind === 'treadmill' ? <Treadmill measure={measure} /> : null}
      {kind === 'swim' ? <Swim measure={measure} /> : null}
    </View>
  );
}

/** O halo do kit: `0 0 Npx` da primária, na opacidade pedida. */
function halo(measure: Measure, color: string, blur: number, alpha = 1): BoxShadowValue {
  return {
    offsetX: 0,
    offsetY: 0,
    blurRadius: measure(blur),
    color: alpha === 1 ? color : comOpacidade(color, alpha),
  };
}

/**
 * Uma peça com sombra e com recorte. São duas camadas pelo mesmo motivo do
 * `Vidro`: no iOS o `overflow: hidden` corta a sombra, então a de fora carrega
 * a sombra e a de dentro recorta o gradiente no raio.
 */
function Clipped({
  radius,
  style,
  children,
}: {
  radius: string;
  style: ViewStyle;
  children: ReactNode;
}) {
  return (
    <View className={cn('absolute', radius)} style={style}>
      <View className={cn('absolute inset-0 overflow-hidden', radius)}>{children}</View>
    </View>
  );
}

interface TubeProps {
  measure: Measure;
  box: { left?: number; right?: number; bottom: number; width: number; height: number };
  colors: readonly [string, string];
  direction: typeof HORIZONTAL | typeof VERTICAL;
  rotate: number;
  shadow?: BoxShadowValue;
}

/** Um tubo de metal escovado: gradiente de dois tons, girado no centro. */
function Tube({ measure, box, colors, direction, rotate, shadow }: TubeProps) {
  return (
    <Clipped
      radius="rounded-full"
      style={{
        left: box.left === undefined ? undefined : measure(box.left),
        right: box.right === undefined ? undefined : measure(box.right),
        bottom: measure(box.bottom),
        width: measure(box.width),
        height: measure(box.height),
        transform: [{ rotate: `${rotate}deg` }],
        boxShadow: shadow ? [shadow] : undefined,
      }}
    >
      <LinearGradient colors={colors} {...direction} className="absolute inset-0" />
    </Clipped>
  );
}

const WHEEL = { size: 96, border: 7, offset: 2, bottom: 6, halo: 22 } as const;

function Bike({ measure }: { measure: Measure }) {
  const cores = useCores();
  const wheel = (side: 'left' | 'right') => (
    <View
      className="absolute rounded-full"
      style={{
        [side]: measure(WHEEL.offset),
        bottom: measure(WHEEL.bottom),
        width: measure(WHEEL.size),
        height: measure(WHEEL.size),
        borderWidth: measure(WHEEL.border),
        borderColor: cores.primary,
        // A face voltada para dentro da bicicleta fica apagada, como no kit.
        [side === 'left' ? 'borderRightColor' : 'borderLeftColor']: illustration.wheelUnlit,
        boxShadow: [halo(measure, cores.primary, WHEEL.halo, 0.7)],
      }}
    />
  );
  const metal = [illustration.metalHighlight, illustration.metalDark] as const;

  return (
    <>
      {wheel('left')}
      {wheel('right')}
      <Tube
        measure={measure}
        box={{ left: 44, bottom: 52, width: 142, height: 6 }}
        colors={[illustration.metalLight, illustration.metalShade]}
        direction={HORIZONTAL}
        rotate={-9}
        shadow={{
          offsetX: 0,
          offsetY: measure(6),
          blurRadius: measure(14),
          color: comOpacidade(illustration.stageShadow, 0.5),
        }}
      />
      <Tube
        measure={measure}
        box={{ left: 70, bottom: 46, width: 92, height: 6 }}
        colors={[illustration.metalMid, illustration.metalDeep]}
        direction={HORIZONTAL}
        rotate={26}
      />
      <Tube
        measure={measure}
        box={{ left: 52, bottom: 48, width: 6, height: 58 }}
        colors={metal}
        direction={VERTICAL}
        rotate={18}
      />
      <Tube
        measure={measure}
        box={{ right: 56, bottom: 52, width: 6, height: 52 }}
        colors={metal}
        direction={VERTICAL}
        rotate={-16}
      />
      <View
        className="absolute rounded-full bg-primary"
        style={{
          left: measure(104),
          bottom: measure(44),
          width: measure(26),
          height: measure(26),
          boxShadow: [halo(measure, cores.primary, 20)],
        }}
      />
    </>
  );
}

const BELT = { width: 160, height: 6, dash: 8, gap: 10 } as const;

function Treadmill({ measure }: { measure: Measure }) {
  const cores = useCores();
  const screenId = `tela${useId().replace(/:/g, '')}`;

  return (
    <>
      <Clipped
        radius="rounded-[0.75rem]"
        style={{
          bottom: measure(22),
          width: measure(186),
          height: measure(22),
          boxShadow: [
            {
              offsetX: 0,
              offsetY: measure(12),
              blurRadius: measure(24),
              color: comOpacidade(illustration.stageShadow, 0.55),
            },
          ],
        }}
      >
        <LinearGradient
          colors={[illustration.deckTop, illustration.deckBottom]}
          {...VERTICAL}
          className="absolute inset-0"
        />
        {/* O `inset 0 2px 0` branco a 20% do kit: a quina de cima do deque. */}
        <View
          className="absolute left-0 right-0 top-0"
          style={{ height: measure(2), backgroundColor: comOpacidade(illustration.white, 0.2) }}
        />
      </Clipped>
      <View
        className="absolute overflow-hidden rounded-full opacity-80"
        style={{ bottom: measure(30), width: measure(BELT.width), height: measure(BELT.height) }}
      >
        <Svg width="100%" height="100%">
          <Line
            x1={0}
            y1={measure(BELT.height) / 2}
            x2={measure(BELT.width)}
            y2={measure(BELT.height) / 2}
            stroke={cores.primary}
            strokeWidth={measure(BELT.height)}
            strokeDasharray={`${measure(BELT.dash)} ${measure(BELT.gap)}`}
          />
        </Svg>
      </View>
      <Tube
        measure={measure}
        box={{ right: 38, bottom: 40, width: 6, height: 74 }}
        colors={[illustration.metalHighlight, illustration.metalDark]}
        direction={VERTICAL}
        rotate={10}
      />
      <Clipped
        radius="rounded-[0.625rem]"
        style={{
          top: measure(12),
          right: measure(22),
          width: measure(66),
          height: measure(44),
          boxShadow: [halo(measure, cores.primary, 18, 0.4)],
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={screenId} cx="20%" cy="8%" rx="120%" ry="90%" fx="20%" fy="8%">
              <Stop offset={0} stopColor={illustration.screenLit} />
              <Stop offset={1} stopColor={illustration.screenOff} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${screenId})`} />
        </Svg>
        {/* A moldura por cima do vidro apagado, dentro do mesmo raio. */}
        <View
          className="absolute inset-0 rounded-[0.625rem]"
          style={{ borderWidth: measure(2), borderColor: illustration.metalDark }}
        />
      </Clipped>
    </>
  );
}

const LANES = [0, 1, 2] as const;
const BALL = { top: 26, size: 54 } as const;
/**
 * O `circle at 34% 28%` do CSS vai até o canto mais distante: a hipotenusa de
 * 66% e 72% do lado.
 */
const BALL_REACH = `${Math.hypot(66, 72).toFixed(1)}%`;

function Swim({ measure }: { measure: Measure }) {
  const cores = useCores();
  const ballId = `bola${useId().replace(/:/g, '')}`;

  return (
    <>
      {LANES.map((lane) => (
        <View
          key={lane}
          className="absolute rounded-full bg-primary"
          style={{
            bottom: measure(34 + lane * 26),
            width: measure(170 - lane * 26),
            height: measure(5),
            opacity: 0.28 + lane * 0.26,
            boxShadow: [halo(measure, cores.primary, 18, 0.6)],
          }}
        />
      ))}
      <Clipped
        radius="rounded-full"
        style={{
          top: measure(BALL.top),
          width: measure(BALL.size),
          height: measure(BALL.size),
          boxShadow: [halo(measure, cores.primary, 26, 0.7)],
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={ballId} cx="34%" cy="28%" r={BALL_REACH} fx="34%" fy="28%">
              <Stop offset={0} stopColor={mixColors(cores.primary, illustration.white, 0.25)} />
              <Stop offset={0.52} stopColor={cores.primary} />
              <Stop offset={1} stopColor={mixColors(cores.primary, illustration.black, 0.6)} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${ballId})`} />
        </Svg>
      </Clipped>
    </>
  );
}

export type { CardioHeroProps };
