import { Ionicons } from '@expo/vector-icons';
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { comOpacidade, illustration, mixColors, useCores, useEscala } from '@/shared/design';

/**
 * A esfera luminosa do kit (`OrbObject`): o objeto das métricas vitais — o fim
 * do cardio, o coração da saúde.
 *
 *     128 × 128, radial at 32% 26%: cor+branco 30% → cor 38% → cor+preto 72% em 78% → cor+preto 45%
 *     inset 0 -14px 26px preto/.4, inset 0 8px 18px branco/.28, 0 20px 40px -10px cor/.6
 *     reflexo: elipse 44 × 26 branca a 55% no alto à esquerda, blur(7px)
 *
 * O reflexo é um radial branco que já se apaga na borda, no lugar do blur que o
 * React Native não tem.
 *
 * @example <Orb icon="bicycle" scale={0.56} glyph={24} />
 */
interface OrbProps {
  icon: keyof typeof Ionicons.glyphMap;
  scale?: number;
  /** Metade do lado do ícone, no desenho. */
  glyph?: number;
  color?: string;
}

const SIDE = 128;

export function Orb({ icon, scale = 1, glyph = 26, color }: OrbProps) {
  const cores = useCores();
  const escalar = useEscala();
  const tint = color ?? cores.primary;
  const measure = (units: number) => escalar(units) * scale;
  const id = `orbe${useId().replace(/:/g, '')}`;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="rounded-full"
      style={{
        width: measure(SIDE),
        height: measure(SIDE),
        boxShadow: [
          {
            offsetX: 0,
            offsetY: measure(20),
            blurRadius: measure(40),
            spreadDistance: measure(-10),
            color: comOpacidade(tint, 0.6),
          },
        ],
      }}
    >
      <View
        className="absolute inset-0 items-center justify-center overflow-hidden rounded-full"
        style={{
          boxShadow: [
            {
              offsetX: 0,
              offsetY: measure(-14),
              blurRadius: measure(26),
              color: comOpacidade(illustration.stageShadow, 0.4),
              inset: true,
            },
            {
              offsetX: 0,
              offsetY: measure(8),
              blurRadius: measure(18),
              color: comOpacidade(illustration.white, 0.28),
              inset: true,
            },
          ],
        }}
      >
        <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          <Defs>
            <RadialGradient id={id} cx="32%" cy="26%" r="100.5%" fx="32%" fy="26%">
              <Stop offset={0} stopColor={mixColors(tint, illustration.white, 0.3)} />
              <Stop offset={0.38} stopColor={tint} />
              <Stop offset={0.78} stopColor={mixColors(tint, illustration.black, 0.72)} />
              <Stop offset={1} stopColor={mixColors(tint, illustration.black, 0.45)} />
            </RadialGradient>
            <RadialGradient id={`${id}reflexo`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset={0} stopColor={illustration.white} stopOpacity={0.55} />
              <Stop offset={0.6} stopColor={illustration.white} stopOpacity={0.3} />
              <Stop offset={1} stopColor={illustration.white} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
          <Rect
            x={measure(15)}
            y={measure(7)}
            width={measure(58)}
            height={measure(40)}
            fill={`url(#${id}reflexo)`}
          />
        </Svg>
        <Ionicons
          name={icon}
          size={measure(glyph * 2)}
          color={comOpacidade(illustration.white, 0.92)}
        />
      </View>
    </View>
  );
}

export type { OrbProps };
