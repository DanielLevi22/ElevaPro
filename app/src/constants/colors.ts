import { coresDoTema } from '@/shared/design';

/**
 * @deprecated Ponte para o design system. Use `useCores()` de `@/shared/design`.
 *
 * Este módulo era a paleta "Energy Gradient" — laranja → rosa — escrita à mão e
 * sobrescrevendo os tokens do design pelo `tailwind.config.js`. Era isso que
 * fazia toda tela nascer coral com o lime declarado logo ao lado (ADR-0025).
 *
 * Agora ele só reempacota `@/shared/design`, então existe uma fonte de cor só e
 * a divergência não pode voltar. Continua existindo por uma razão prática: 10
 * dos 47 arquivos que o importam leem cor em escopo de módulo, onde um hook não
 * pode ser chamado. Migrá-los exigiria reestruturar telas que serão reescritas
 * lote a lote de qualquer forma.
 *
 * **Congelado no tema escuro.** Quem lê daqui não acompanha a troca de tema —
 * mais uma razão para sair. Cada lote de telas remove seus call sites; quando o
 * último sair, este arquivo vai junto.
 */
const escuro = coresDoTema('escuro');
const claro = coresDoTema('claro');

export const colors = {
  primary: {
    start: escuro.primary,
    end: escuro.accent,
    solid: escuro.primary,
    light: escuro.primary,
    dark: escuro.primaryText,
  },
  secondary: {
    main: escuro.secondary,
    light: escuro.secondary,
    dark: escuro.secondary,
  },
  accent: {
    main: escuro.accent,
    light: escuro.accent,
    dark: escuro.accent,
  },
  background: {
    primary: escuro.background,
    secondary: escuro.card,
    surface: escuro.card,
    elevated: escuro.muted,
  },
  text: {
    primary: escuro.foreground,
    secondary: escuro.mutedForeground,
    muted: escuro.mutedForeground,
    disabled: escuro.placeholder,
  },
  status: {
    success: escuro.success,
    warning: escuro.warning,
    error: escuro.destructive,
    info: escuro.secondary,
  },
  border: {
    default: escuro.border,
    light: escuro.border,
    dark: escuro.border,
  },
  /**
   * O design não tem paleta de macronutriente. Carboidrato era roxo, que não
   * existe mais, e caiu no accent por ser a terceira cor de sinal. Quando a
   * tela de nutrição for reconstruída, isso vira decisão de design, não
   * herança.
   */
  macro: {
    protein: escuro.success,
    carbs: escuro.accent,
    fat: escuro.warning,
    calories: escuro.foreground,
  },
  gradients: {
    primary: [escuro.primary, escuro.accent],
    primaryReverse: [escuro.accent, escuro.primary],
    secondary: [escuro.secondary, escuro.secondary],
    accent: [escuro.accent, escuro.accent],
    success: [escuro.success, escuro.success],
    dark: [escuro.card, escuro.background],
  },
} as const;

/** @deprecated Estrutura antiga que `Themed.tsx` ainda consome. */
export default {
  ...colors,
  light: {
    text: claro.foreground,
    background: claro.background,
    tint: claro.primary,
    tabIconDefault: claro.mutedForeground,
    tabIconSelected: claro.primary,
  },
  dark: {
    text: escuro.foreground,
    background: escuro.background,
    tint: escuro.primary,
    tabIconDefault: escuro.mutedForeground,
    tabIconSelected: escuro.primary,
  },
};
