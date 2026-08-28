/**
 * Paleta do Eleva Pro no mobile — derivada do projeto Claude Design.
 *
 * ## Por que este arquivo mudou de cor
 *
 * Até 2026-08-28 ele declarava a "Energy Gradient": laranja `#FF6B35` → rosa
 * `#FF2E63`, com sólido coral `#FF4D5A`. Isso contradizia `app/src/global.css`,
 * que sempre declarou o lime `#CCFF00` — e como `tailwind.config.js`
 * sobrescrevia os tokens com os valores daqui, `className="bg-primary"` e
 * `var(--color-primary)` devolviam cores diferentes na mesma tela. Com
 * `--primary-foreground` sendo preto (desenhado para o lime), o resultado
 * visível era texto preto sobre botão coral.
 *
 * O PRD `design-system-unification.md` decidiu em 2026-08-09: **lime, não
 * coral** — o produto tem uma marca só. O web já foi migrado; o mobile ficou
 * para depois e é isto aqui.
 *
 * ## A fonte da verdade
 *
 * Os valores abaixo espelham `design/tokens/colors.css`, cópia versionada do
 * projeto Claude Design. Mudou lá, muda aqui — e em `app/src/global.css`, que
 * declara os mesmos tokens em HSL para o NativeWind.
 *
 * | Papel | Design | Hex |
 * |---|---|---|
 * | primary | `--lime` | `#CCFF00` |
 * | secondary | `--cyber-blue` | `#00F0FF` |
 * | accent | `--hot-pink` | `#FF0099` |
 *
 * ## Sobre os gradientes
 *
 * O Claude Design **não tem gradiente de marca**: a linguagem dele é cor chapada
 * com *glow* neon (`--glow-primary` e irmãos). Os gradientes que sobraram aqui
 * são de mesmo matiz — do tom para uma variação mais escura dele —, para as 25
 * chamadas de `LinearGradient` que existem no app continuarem funcionando sem
 * inventar um segundo matiz que o design não define. Trocá-los por cor chapada
 * mais glow é redesenho de tela, e está registrado no PRD.
 */

/** Lime `#CCFF00` — `--lime` no design. */
const LIME = '#CCFF00';
/** Cyber blue `#00F0FF` — `--cyber-blue` no design. */
const CYBER_BLUE = '#00F0FF';
/** Hot pink `#FF0099` — `--hot-pink` no design. */
const HOT_PINK = '#FF0099';

export const colors = {
  primary: {
    start: LIME,
    end: '#A3CC00', // lime escurecido, para o gradiente de mesmo matiz
    solid: LIME,
    light: '#E0FF66',
    dark: '#A3CC00',
  },

  secondary: {
    main: CYBER_BLUE,
    light: '#66F6FF',
    dark: '#00C0CC',
  },

  accent: {
    main: HOT_PINK,
    light: '#FF66C2',
    dark: '#CC007A',
  },

  // Zinc, como o design: `--background` é zinc-950 e as superfícies sobem daí.
  background: {
    primary: '#09090B', // zinc-950
    secondary: '#18181B', // zinc-900
    surface: '#18181B', // zinc-900 — `--surface`
    elevated: '#27272A', // zinc-800 — `--surface-highlight`
  },

  text: {
    primary: '#FAFAFA', // zinc-50 — `--foreground`
    secondary: '#A1A1AA', // zinc-400
    muted: '#71717A', // zinc-500
    disabled: '#52525B', // zinc-600
  },

  status: {
    success: '#10B981', // emerald-500 — `--success`
    warning: '#F59E0B', // amber-500 — `--warning`
    error: '#EF4444', // red-500 — `--destructive`
    info: CYBER_BLUE,
  },

  border: {
    default: '#27272A', // zinc-800 — `--border`
    light: '#3F3F46', // zinc-700
    dark: '#18181B', // zinc-900
  },

  // Macros: papéis de dado, não de marca. Mantidos distinguíveis entre si e
  // fora do matiz da primária, para um gráfico não parecer "tudo primário".
  macro: {
    protein: '#10B981', // emerald
    carbs: HOT_PINK,
    fat: '#F59E0B', // amber
    calories: '#FAFAFA',
  },

  // Tuplas de propósito: `LinearGradient` do expo exige tuple, não array.
  gradients: {
    primary: [LIME, '#A3CC00'] as const,
    primaryReverse: ['#A3CC00', LIME] as const,
    secondary: [CYBER_BLUE, '#00C0CC'] as const,
    accent: [HOT_PINK, '#CC007A'] as const,
    success: ['#10B981', '#059669'] as const,
    dark: ['#18181B', '#09090B'] as const,
  },
};

/**
 * Sombra do *glow* neon, o efeito que substitui o gradiente na linguagem do
 * design (`--glow-primary` e irmãos em `design/tokens/effects.css`).
 */
export const glows = {
  primary: 'rgba(204, 255, 0, 0.5)',
  secondary: 'rgba(0, 240, 255, 0.4)',
  accent: 'rgba(255, 0, 153, 0.4)',
};

/**
 * Forma antiga que `components/Themed.tsx` consome (`Colors.light` /
 * `Colors.dark`). Sobra do template do Expo; os valores agora saem da paleta
 * acima em vez de serem cravados.
 */
const legacyTheme = {
  light: {
    text: '#09090B', // zinc-950
    background: '#FAFAFA', // zinc-50
    tint: colors.primary.solid,
    tabIconDefault: colors.text.muted,
    tabIconSelected: colors.primary.solid,
  },
  dark: {
    text: colors.text.primary,
    background: colors.background.primary,
    tint: colors.primary.solid,
    tabIconDefault: colors.text.muted,
    tabIconSelected: colors.primary.solid,
  },
};

export default {
  ...colors,
  ...legacyTheme,
};
