import { coresDoTema, mixColors, type Tema } from '@/shared/design';

/** As cores que a tela bloqueada pinta, nos nomes que o código nativo usa. */
export type RestTimerColor =
  | 'surface'
  | 'label'
  | 'secondaryLabel'
  | 'primary'
  | 'primaryText'
  | 'onPrimary'
  | 'track'
  | 'secondaryButton'
  | 'secondaryButtonBorder';

const RGBA = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;

/**
 * Achata a cor translúcida do vidro sobre a superfície. A notificação e a Live
 * Activity pedem cor opaca: o vidro de verdade depende do que está atrás, e
 * atrás delas está o papel de parede, que o app não controla.
 */
function flatten(color: string, surface: string): string {
  const match = RGBA.exec(color);
  if (!match) return color;
  const hex = `#${match
    .slice(1, 4)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`;
  return mixColors(hex, surface, Number(match[4]));
}

/**
 * A paleta do descanso na tela bloqueada, derivada dos tokens do tema.
 *
 * O código nativo não lê TypeScript: ele recebe uma cópia em
 * `modules/rest-timer-activity/palette.json` (iOS) e nos `colors.xml` (Android),
 * e um teste trava as cópias contra esta função.
 *
 * @example restTimerPalette('escuro').primary // o lime da marca
 */
export function restTimerPalette(tema: Tema): Record<RestTimerColor, string> {
  const cores = coresDoTema(tema);
  const surface = cores.card;
  return {
    surface,
    label: cores.foreground,
    secondaryLabel: flatten(cores.mutedForeground, surface),
    primary: cores.primary,
    primaryText: cores.primaryText,
    onPrimary: cores.primaryForeground,
    track: flatten(cores.glassStrong, surface),
    secondaryButton: flatten(cores.glassStrong, surface),
    secondaryButtonBorder: flatten(cores.glassBorder, surface),
  };
}
