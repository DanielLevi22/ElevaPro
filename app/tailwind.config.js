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

/**
 * A base de `rem`. Espelha `REM_BASE` de src/shared/design/tokens.ts, e o teste
 * de lá falha se as duas divergirem.
 */
const REM_BASE = 16;

const emRem = (px) => `${px / REM_BASE}rem`;

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
          tertiary: literal('on-hero-tertiary'),
          chip: literal('hero-chip'),
          'chip-border': literal('hero-chip-border'),
        },
        /**
         * A pilha de vidro do kit. `glass` é o preenchimento do meio, `top` e
         * `bottom` são as pontas do gradiente vertical, e `specular` é o brilho
         * interno que dá espessura à borda. `strong` é trilho de progresso e
         * fundo de ícone neutro.
         */
        glass: {
          DEFAULT: literal('glass'),
          strong: literal('glass-strong'),
          border: literal('glass-border'),
          top: literal('glass-top'),
          bottom: literal('glass-bottom'),
        },
        specular: {
          DEFAULT: literal('specular'),
          bottom: literal('specular-bottom'),
        },
        sombra: literal('sombra'),
        'barra-de-abas': literal('barra-de-abas'),
        /** Legenda sobre foto com véu preto: igual nos dois temas. */
        'sobre-imagem': {
          DEFAULT: literal('sobre-imagem'),
          secundario: literal('sobre-imagem-secundario'),
        },
        /** Cor por grandeza: a mesma no ícone, no anel e na barra da métrica. */
        metrica: {
          passos: comAlfa('metrica-passos'),
          calorias: comAlfa('metrica-calorias'),
          sono: comAlfa('metrica-sono'),
          proteina: comAlfa('metrica-proteina'),
          carboidrato: comAlfa('metrica-carboidrato'),
          gordura: comAlfa('metrica-gordura'),
        },
      },
      // Em `rem` pelo mesmo motivo da escala de texto: o raio é medida do
      // desenho e cresce com ela. `full` fica de fora, é pílula.
      borderRadius: {
        sm: emRem(8),
        md: emRem(12),
        lg: emRem(16),
        xl: emRem(22),
        '2xl': emRem(24),
        '3xl': emRem(32),
        painel: emRem(40),
      },
      /**
       * Em React Native o peso não se combina com família própria: cada peso é
       * uma família registrada com nome próprio. Por isso `font-display` e
       * `font-display-black` são duas classes, e não uma classe mais
       * `font-extrabold`.
       *
       * `sans` fica na fonte do sistema de propósito — é a decisão do desenho, e
       * é o que faz o app parecer nativo. Carregar Inter para o corpo inteiro
       * custa bundle para desfazer isso.
       */
      fontFamily: {
        sans: ['System'],
        display: ['Outfit_700Bold'],
        'display-black': ['Outfit_800ExtraBold'],
        mono: ['JetBrainsMono_400Regular'],
        'mono-semibold': ['JetBrainsMono_600SemiBold'],
      },
      /**
       * Escala iOS, vinda das telas do mobile — não a do dashboard, que tem 14
       * de corpo. Espelha `escala.texto` de src/shared/design/tokens.ts.
       *
       * Em `rem`, e não em `px`, de propósito: o NativeWind resolve `rem` a
       * partir de um observável que `ajustarEscalaDeTexto()` define no boot
       * conforme a largura do aparelho. O desenho foi feito para 390pt, e num
       * aparelho de 448dp o mesmo `32px` ocuparia 15% menos da tela. Com `rem`
       * a proporção do desenho se mantém sem tocar em nenhum call site.
       *
       * Os números são os do desenho, em pixel, divididos pela base — ficam
       * legíveis aqui e o teste dos tokens confere o caminho de volta.
       */
      fontSize: {
        micro: emRem(12),
        legenda: emRem(13),
        rotulo: emRem(16),
        corpo: emRem(17),
        h2: emRem(20),
        h1: emRem(24),
        numero: emRem(28),
        display: emRem(32),
      },
    },
  },
  plugins: [],
};
