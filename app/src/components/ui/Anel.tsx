import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';

/**
 * Anel de progresso, com o valor no meio.
 *
 * É como o kit de vidro mostra progresso — meta do dia, calorias — no lugar da
 * barra que o `ProgressCard` usa nas telas chapadas.
 *
 * O desenho põe `filter: drop-shadow(0 0 14px cor)` no anel, e é esse brilho
 * que faz o anel ler como neon. React Native não tem filtro em SVG, então o
 * brilho é **o resultado do filtro desenhado à mão** — ver `CAMADAS_DO_BRILHO`.
 *
 * @example
 * <Anel valor={68} meta={100} rotulo="68%" sub="Meta do dia" />
 */
interface AnelProps {
  valor: number;
  meta: number;
  /** O que aparece no centro. Não é derivado do valor: "7h20" não é "7,33". */
  rotulo: string;
  sub?: string;
  /** Diâmetro no desenho, antes da escala do aparelho. */
  tamanho?: number;
  cor?: string;
}

const TAMANHO_PADRAO = 168;
const ESPESSURA = 13;

/**
 * O `drop-shadow(0 0 14px)` do kit, como traços empilhados sob o anel.
 *
 * No `drop-shadow` o valor é o raio do blur, e o desvio-padrão é a metade — o
 * inverso do `filter: blur()`, onde o valor já é o desvio. Então é uma
 * gaussiana de sigma 7 sobre o traço de 13: do eixo para fora, a luz vale
 * `Φ((x+6,5)/7) − Φ((x−6,5)/7)` — 47% na borda do traço e 1% a 22,5 do eixo.
 *
 * Cada linha é um traço mais largo (meia-largura, no desenho) e sua opacidade.
 * As opacidades foram resolvidas de fora para dentro para que a composição das
 * camadas siga essa curva; com doze camadas o erro máximo é 3,5 pontos, e fica
 * colado à borda do traço. Com cinco eram 6,4, e o degrau aparecia.
 */
const CAMADAS_DO_BRILHO = [
  [24, 0.008],
  [22.54, 0.006],
  [21.08, 0.01],
  [19.63, 0.015],
  [18.17, 0.021],
  [16.71, 0.03],
  [15.25, 0.041],
  [13.79, 0.054],
  [12.33, 0.068],
  [10.88, 0.083],
  [9.42, 0.099],
  [7.96, 0.112],
] as const;

/** Quanto o brilho passa da borda do traço: a camada mais larga, menos meio traço. */
const SANGRIA_DO_BRILHO = CAMADAS_DO_BRILHO[0][0] - ESPESSURA / 2;

/** O desenho dimensiona o número pelo anel: 26% do diâmetro. */
const FRACAO_DO_ROTULO = 0.26;

const VOLTA_COMPLETA = 100;

export function Anel({ valor, meta, rotulo, sub, tamanho = TAMANHO_PADRAO, cor }: AnelProps) {
  const cores = useCores();
  const escalar = useEscala();

  const lado = escalar(tamanho);
  const espessura = escalar(ESPESSURA);
  const raio = (lado - espessura) / 2;
  const perimetro = 2 * Math.PI * raio;
  const preenchido = (fracaoPreenchida(valor, meta) / VOLTA_COMPLETA) * perimetro;
  // A tela do SVG cresce para caber o brilho, e o anel continua ocupando `lado`.
  const margem = escalar(SANGRIA_DO_BRILHO);
  const tela = lado + 2 * margem;
  const centro = tela / 2;
  const traco = cor ?? cores.primary;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: meta, now: valor, text: `${rotulo} ${sub ?? ''}`.trim() }}
      style={{ width: lado, height: lado }}
    >
      {/* O traço nasce às três horas; girar um quarto de volta o leva ao topo. */}
      <Svg
        width={tela}
        height={tela}
        style={{
          position: 'absolute',
          top: -margem,
          left: -margem,
          transform: [{ rotate: '-90deg' }],
        }}
      >
        {CAMADAS_DO_BRILHO.map(([meiaLargura, opacidade]) => (
          <Circle
            key={meiaLargura}
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            stroke={traco}
            strokeOpacity={opacidade}
            strokeWidth={escalar(meiaLargura * 2)}
            strokeLinecap="round"
            strokeDasharray={`${preenchido} ${perimetro}`}
          />
        ))}
        <Circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke={cores.glassStrong}
          strokeWidth={espessura}
        />
        <Circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke={traco}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${perimetro}`}
        />
      </Svg>

      <View className="absolute inset-0 items-center justify-center">
        <Text
          className="font-display-black tracking-tight text-hero"
          style={{ fontSize: lado * FRACAO_DO_ROTULO, lineHeight: lado * FRACAO_DO_ROTULO }}
        >
          {rotulo}
        </Text>
        {sub ? (
          <Text className="mt-1 text-micro font-semibold uppercase tracking-widest text-hero-tertiary">
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Meta zerada vale como cheia, e não como divisão por zero: "0 de 0 refeições"
 * é meta cumprida. Mesma regra do `ProgressCard`, e pelo mesmo motivo.
 */
function fracaoPreenchida(valor: number, meta: number): number {
  if (meta <= 0) return VOLTA_COMPLETA;
  return Math.min(VOLTA_COMPLETA, Math.max(0, (valor / meta) * VOLTA_COMPLETA));
}

export type { AnelProps };
