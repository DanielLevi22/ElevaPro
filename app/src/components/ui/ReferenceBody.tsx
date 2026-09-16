import { useId } from 'react';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';
import {
  REFERENCE_BODY_VIEWBOX,
  type ReferencePose,
  referenceBodyPaths,
} from './referenceBodyPaths';

/**
 * O corpo de referência do body scan (`BodyFigure` do kit): frente, costas ou
 * perfil, em contorno com preenchimento translúcido e as linhas de relevo.
 *
 *     preenchimento: cor a 42% → 18% em 55% → 34%; traço 2; relevo 1,2 a 55%
 *     brilho: drop-shadow(0 0 16px cor/.5)
 *
 * O `drop-shadow` não vira `filter`: no Android o filtro desenha a view numa
 * camada do tamanho da caixa e recorta o halo. Ele vira o mesmo contorno em
 * dois traços largos e translúcidos por trás, que acompanham a silhueta como a
 * sombra do CSS acompanha.
 *
 * Não é o corpo de quem escaneia, e por isso existe: a grade e a câmera mostram
 * a pose pedida sem mostrar a foto (#316).
 *
 * @example <ReferenceBody pose="side" height={148} tone="muted" glow={false} />
 */
interface ReferenceBodyProps {
  pose?: ReferencePose;
  /** Altura no desenho, em pt do kit; a largura sai da proporção. */
  height: number;
  /**
   * `height` já em dp, sem a escala do desenho: a câmera encaixa o corpo entre
   * as marcas, que são fração da tela.
   */
  absolute?: boolean;
  /** `muted` é a pose ainda não feita: o tom terciário, sem brilho. */
  tone?: 'brand' | 'muted';
  /** Cor já resolvida, no lugar do tom: a proximidade, na câmera. */
  color?: string;
  glow?: boolean;
  opacity?: number;
}

const FILL_STOPS = [
  { offset: 0, opacity: 0.42 },
  { offset: 0.55, opacity: 0.18 },
  { offset: 1, opacity: 0.34 },
] as const;

/** Os dois anéis do halo: largura do traço na caixa do desenho e opacidade. */
const HALO = [
  { width: 14, opacity: 0.08 },
  { width: 7, opacity: 0.16 },
] as const;

const MIRROR = 'translate(200,0) scale(-1,1)';

export function ReferenceBody({
  pose = 'front',
  height,
  absolute = false,
  tone = 'brand',
  color: forcedColor,
  glow = true,
  opacity = 1,
}: ReferenceBodyProps) {
  const cores = useCores();
  const escalar = useEscala();
  const color = forcedColor ?? (tone === 'brand' ? cores.primary : cores.placeholder);
  const { outline, detail } = referenceBodyPaths(pose);
  const side = absolute ? height : escalar(height);
  // `useId` devolve ":r0:", e dois-pontos quebram a referência `url(#…)`.
  const id = `corpo${useId().replace(/:/g, '')}`;
  const { width: boxWidth, height: boxHeight } = REFERENCE_BODY_VIEWBOX;

  return (
    <Svg
      width={(side * boxWidth) / boxHeight}
      height={side}
      viewBox={`0 0 ${boxWidth} ${boxHeight}`}
      opacity={opacity}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {FILL_STOPS.map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={color}
              stopOpacity={stop.opacity}
            />
          ))}
        </LinearGradient>
      </Defs>
      <G transform={pose === 'back' ? MIRROR : undefined}>
        {glow
          ? HALO.map((ring) => (
              <G key={ring.width} opacity={ring.opacity}>
                {outline.map((d) => (
                  <Path
                    key={d}
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={ring.width}
                    strokeLinejoin="round"
                  />
                ))}
              </G>
            ))
          : null}
        {outline.map((d) => (
          <Path
            key={d}
            d={d}
            fill={`url(#${id})`}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        <G opacity={0.55}>
          {detail.map((d) => (
            <Path key={d} d={d} fill="none" stroke={color} strokeWidth={1.2} />
          ))}
        </G>
      </G>
    </Svg>
  );
}

export type { ReferenceBodyProps, ReferencePose };
