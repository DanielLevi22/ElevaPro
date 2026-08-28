module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Todos os tokens vêm de `src/global.css`, que espelha o projeto Claude
      // Design. Antes, `primary`, `secondary`, `accent` e `background` eram
      // sobrescritos aqui com a paleta "Energy Gradient" do `constants/colors`
      // — coral —, enquanto o CSS declarava lime. `bg-primary` e
      // `var(--color-primary)` devolviam cores diferentes na mesma tela.
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
          hover: 'var(--color-primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
          hover: 'var(--color-secondary-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
          hover: 'var(--color-accent-hover)',
        },
        background: 'var(--color-background)',
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
