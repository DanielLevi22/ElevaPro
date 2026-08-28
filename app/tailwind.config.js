const { tailwindColors } = require('./src/constants/colors');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Override with mobile-specific Energy Gradient colors
        primary: tailwindColors.primary,
        secondary: tailwindColors.secondary,
        accent: tailwindColors.accent,
        background: tailwindColors.background,
        // Keep semantic colors from shared theme
        surface: 'var(--color-surface)',
        foreground: 'var(--color-foreground)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        // Defaulting to system fonts if specific ones aren't available locally yet
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
