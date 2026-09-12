/**
 * As cores vêm de `src/global.css`, que é gerado por `src/shared/design/tokens.ts`.
 *
 * Não declare hexadecimal aqui. A versão anterior deste arquivo sobrescrevia
 * `primary`, `secondary`, `accent` e `background` com a paleta coral de
 * `src/constants/colors.ts`, e era isso que fazia toda tela nascer laranja
 * apesar de o token lime estar declarado logo ao lado — ver ADR-0025.
 */

/** Token com alfa embutido: entra cru, sem `hsl()`, e não aceita `/50`. */
const literal = (nome) => `var(--${nome})`;

/** Token em triplete: aceita modificador de opacidade (`bg-primary/20`). */
const comAlfa = (nome) => `hsl(var(--${nome}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // Obrigatório: sem `class`, o NativeWind recusa trocar o tema em runtime e a
  // opção de tema das configurações não teria como funcionar.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: comAlfa('background'),
        foreground: comAlfa('foreground'),
        card: {
          DEFAULT: comAlfa('card'),
          foreground: comAlfa('card-foreground'),
        },
        primary: {
          DEFAULT: comAlfa('primary'),
          foreground: comAlfa('primary-foreground'),
          text: comAlfa('primary-text'),
        },
        secondary: {
          DEFAULT: comAlfa('secondary'),
          foreground: comAlfa('secondary-foreground'),
        },
        accent: {
          DEFAULT: comAlfa('accent'),
          foreground: comAlfa('accent-foreground'),
        },
        destructive: {
          DEFAULT: comAlfa('destructive'),
          foreground: comAlfa('destructive-foreground'),
        },
        success: {
          DEFAULT: comAlfa('success'),
          foreground: comAlfa('success-foreground'),
        },
        warning: {
          DEFAULT: comAlfa('warning'),
          foreground: comAlfa('warning-foreground'),
        },
        border: literal('border'),
        muted: {
          DEFAULT: literal('muted'),
          foreground: literal('muted-foreground'),
        },
        placeholder: literal('placeholder'),
        hero: {
          DEFAULT: literal('on-hero'),
          secondary: literal('on-hero-secondary'),
          chip: literal('hero-chip'),
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
        '2xl': '24px',
        '3xl': '32px',
        painel: '40px',
      },
      // Escala iOS, vinda das telas do mobile — não a do dashboard, que tem 14
      // de corpo. Espelha `escala.texto` de src/shared/design/tokens.ts.
      fontSize: {
        micro: '12px',
        legenda: '13px',
        rotulo: '16px',
        corpo: '17px',
        h2: '20px',
        h1: '24px',
        display: '32px',
      },
    },
  },
  plugins: [],
};
