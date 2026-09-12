import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';

/**
 * Anel de progresso, com o valor no meio.
 *
 * É como o kit de vidro mostra progresso — meta do dia, calorias — no lugar da
 * barra que o `ProgressCard` usa nas telas chapadas.
 *
 * O desenho põe um `drop-shadow` colorido em volta do traço, para o anel
 * brilhar. React Native não tem filtro em SVG; o brilho não é reproduzido. É
 * diferença medida e aceita, como o filtro de imagem do `Hero` na #286 —
 * persegui-la exigiria trazer Skia só para isto.
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

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: meta, now: valor, text: `${rotulo} ${sub ?? ''}`.trim() }}
      style={{ width: lado, height: lado }}
    >
      {/* O traço nasce às três horas; girar um quarto de volta o leva ao topo. */}
      <Svg width={lado} height={lado} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={lado / 2}
          cy={lado / 2}
          r={raio}
          fill="none"
          stroke={cores.glassStrong}
          strokeWidth={espessura}
        />
        <Circle
          cx={lado / 2}
          cy={lado / 2}
          r={raio}
          fill="none"
          stroke={cor ?? cores.primary}
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
