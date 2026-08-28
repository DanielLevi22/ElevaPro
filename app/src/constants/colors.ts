/**
 * Energy Gradient Color System
 * Mobile-only color palette for Eleva Pro
 *
 * Design Philosophy:
 * - Vibrant orange-to-pink gradients for energy and motivation
 * - Electric blue for secondary actions and info
 * - Vibrant purple for accents and highlights
 * - Deep blacks for premium dark mode experience
 */

export const colors = {
  // Primary Gradient (Orange → Pink)
  primary: {
    start: '#FF6B35', // Vibrant Orange
    end: '#FF2E63', // Hot Pink
    solid: '#FF4D5A', // Mid-point for solid usage
    light: '#FF8A65', // Lighter variant
    dark: '#E63946', // Darker variant
  },

  // Secondary (Electric Blue)
  secondary: {
    main: '#00D9FF', // Electric Blue
    light: '#33E3FF', // Light Blue
    dark: '#00B8D9', // Dark Blue
  },

  // Accent (Vibrant Purple)
  accent: {
    main: '#9D4EDD', // Vibrant Purple
    light: '#B565F0', // Light Purple
    dark: '#8338C9', // Dark Purple
  },

  // Backgrounds
  background: {
    primary: '#0A0A0A', // Deep Black
    secondary: '#1A1A1A', // Dark Gray
    surface: '#242424', // Card/Surface
    elevated: '#2E2E2E', // Elevated Surface
  },

  // Text
  text: {
    primary: '#FFFFFF', // White
    secondary: '#A1A1AA', // Light Gray
    muted: '#71717A', // Muted Gray
    disabled: '#52525B', // Disabled Gray
  },

  // Status Colors
  status: {
    success: '#00C9A7', // Emerald Green
    warning: '#FFB800', // Gold Yellow
    error: '#FF3B30', // Red
    info: '#00D9FF', // Electric Blue
  },

  // Borders
  border: {
    default: '#3F3F46', // Zinc-700
    light: '#52525B', // Zinc-600
    dark: '#27272A', // Zinc-800
  },

  // Macros
  macro: {
    protein: '#00C9A7', // Emerald Green
    carbs: '#9D4EDD', // Vibrant Purple
    fat: '#FFB800', // Gold Yellow
    calories: '#FFFFFF', // White
  },

  // Gradients (for LinearGradient usage - using tuples for type safety)
  gradients: {
    primary: ['#FF6B35', '#FF2E63'] as const, // Orange to Pink
    primaryReverse: ['#FF2E63', '#FF6B35'] as const, // Pink to Orange
    secondary: ['#00D9FF', '#00B8D9'] as const, // Blue gradient
    accent: ['#9D4EDD', '#8338C9'] as const, // Purple gradient
    success: ['#00C9A7', '#00A88E'] as const, // Green gradient
    dark: ['#1A1A1A', '#0A0A0A'] as const, // Dark gradient
  },
};

// Tailwind-compatible color object
export const tailwindColors = {
  primary: {
    DEFAULT: colors.primary.solid,
    50: '#FFE8E0',
    100: '#FFD1C1',
    200: '#FFA38A',
    300: '#FF8A65',
    400: '#FF6B35',
    500: colors.primary.solid,
    600: '#E63946',
    700: '#CC2936',
    800: '#B31B28',
    900: '#99101C',
  },
  secondary: {
    DEFAULT: colors.secondary.main,
    50: '#E0F7FF',
    100: '#B3EDFF',
    200: '#80E3FF',
    300: '#4DD9FF',
    400: '#26D4FF',
    500: colors.secondary.main,
    600: '#00B8D9',
    700: '#0097B3',
    800: '#00768C',
    900: '#005566',
  },
  accent: {
    DEFAULT: colors.accent.main,
    50: '#F3E8FF',
    100: '#E4C7FF',
    200: '#D4A5FF',
    300: '#C483FF',
    400: '#B565F0',
    500: colors.accent.main,
    600: '#8338C9',
    700: '#6B2BA3',
    800: '#531F7D',
    900: '#3B1357',
  },
  background: {
    DEFAULT: colors.background.primary,
    primary: colors.background.primary,
    secondary: colors.background.secondary,
    surface: colors.background.surface,
    elevated: colors.background.elevated,
  },
};

// Legacy theme structure for backward compatibility with Themed.tsx
const legacyTheme = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: colors.primary.solid,
    tabIconDefault: '#CCCCCC',
    tabIconSelected: colors.primary.solid,
  },
  dark: {
    text: colors.text.primary,
    background: colors.background.primary,
    tint: colors.primary.solid,
    tabIconDefault: '#CCCCCC',
    tabIconSelected: colors.primary.solid,
  },
};

// Default export includes both new structure and legacy theme
export default {
  ...colors,
  ...legacyTheme,
};
