import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useBrilho, useCores, useEscala } from '@/shared/design';

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
 * O descanso do fluxo de treino usa o mesmo anel, mais fino, com o trilho
 * pontilhado e um ponto brilhando na ponta do arco. O mostrador da sessão de
 * cardio é o mesmo anel aberto: 76% da volta, começando embaixo à esquerda. As
 * duas são variação, e não componente novo: a geometria e o brilho são os
 * mesmos, só medidos de outro jeito.
 *
 * @example
 * <Anel valor={68} meta={100} rotulo="68%" sub="Meta do dia" />
 * <Anel valor={45} meta={90} rotulo="00:45" tamanho={166} espessura={5} brilho={10} pontilhado ponto>
 *   <RelogioDoDescanso />
 * </Anel>
 * <Anel valor={18} meta={30} rotulo="18:36" tamanho={222} espessura={15} arco={ARCO_DO_MOSTRADOR} ponto />
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
  /** Largura do traço no desenho. */
  espessura?: number;
  /** O raio do `drop-shadow` do kit: 14 no anel cheio, 10 no descanso. */
  brilho?: number;
  /** Trilho em pontos (`stroke-dasharray: 2 9`), como o do descanso. */
  pontilhado?: boolean;
  /** O ponto com brilho próprio na ponta do arco. */
  ponto?: boolean;
  /**
   * Quanto da volta o anel ocupa, de 0 a 1. Abaixo de 1 o anel abre embaixo, como
   * o mostrador do cardio (`sweep = 0.76`, girado 135°): trilho e arco começam no
   * mesmo lugar e o vão fica centrado na base.
   */
  arco?: number;
  /** O miolo, quando não é só o rótulo: o relógio do descanso tem três linhas. */
  children?: ReactNode;
}

const TAMANHO_PADRAO = 168;
const ESPESSURA = 13;
const BRILHO_PADRAO = 14;

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

type Camada = readonly [meiaLargura: number, opacidade: number];

/**
 * As camadas medidas para outro traço e outro brilho.
 *
 * A curva foi resolvida para traço de 13 e sigma 7. Com outra medida, a
 * distância de cada camada até a borda do traço cresce ou encolhe na razão do
 * sigma, e a opacidade fica — é a mesma gaussiana, esticada.
 */
function camadasPara(espessura: number, brilho: number): Camada[] {
  const razao = brilho / BRILHO_PADRAO;
  return CAMADAS_DO_BRILHO.map(
    ([meiaLargura, opacidade]) =>
      [espessura / 2 + (meiaLargura - ESPESSURA / 2) * razao, opacidade] as const
  );
}

/** O tracejado do trilho pontilhado do kit: ponto de 2, vão de 9. */
const PONTILHADO = [2, 9] as const;
/** O ponto da ponta: raio 6, com `drop-shadow(0 0 12px)`. */
const RAIO_DO_PONTO = 6;
const BRILHO_DO_PONTO = 12;

/** O desenho dimensiona o número pelo anel: 26% do diâmetro. */
const FRACAO_DO_ROTULO = 0.26;

const VOLTA_COMPLETA = 100;

/** O mostrador do kit de cardio: 76% da volta. */
export const ARCO_DO_MOSTRADOR = 0.76;

/**
 * Onde o traço começa, em graus a partir das três horas. O anel fechado começa no
 * topo; o aberto, onde o kit o põe (`rotate(135deg)`), com o vão embaixo.
 */
function inicioDoTraco(arco: number): number {
  return arco >= 1 ? -90 : 135;
}

export function Anel({
  valor,
  meta,
  rotulo,
  sub,
  tamanho = TAMANHO_PADRAO,
  cor,
  espessura = ESPESSURA,
  brilho = BRILHO_PADRAO,
  pontilhado = false,
  ponto = false,
  arco = 1,
  children,
}: AnelProps) {
  const cores = useCores();
  const escalar = useEscala();
  const lado = escalar(tamanho);
  const camadas = camadasPara(espessura, brilho);
  // A tela do SVG cresce para caber o brilho, e o anel continua ocupando `lado`.
  const margem = escalar(camadas[0][0] - espessura / 2);
  const geometria = geometriaDoAnel(lado, margem, escalar(espessura), { valor, meta, arco });
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
        width={lado + 2 * margem}
        height={lado + 2 * margem}
        style={{
          position: 'absolute',
          top: -margem,
          left: -margem,
          transform: [{ rotate: `${geometria.inicio}deg` }],
        }}
      >
        <Tracos
          geometria={geometria}
          camadas={camadas}
          traco={traco}
          trilho={cores.glassStrong}
          pontilhado={pontilhado}
        />
      </Svg>
      {ponto ? <PontoDaPonta geometria={geometria} margem={margem} cor={traco} /> : null}

      <View className="absolute inset-0 items-center justify-center">
        {children ?? <RotuloDoAnel rotulo={rotulo} sub={sub} lado={lado} />}
      </View>
    </View>
  );
}

function RotuloDoAnel({ rotulo, sub, lado }: { rotulo: string; sub?: string; lado: number }) {
  return (
    <>
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
    </>
  );
}

interface GeometriaDoAnel {
  centro: number;
  raio: number;
  espessura: number;
  /** `strokeDasharray` do arco preenchido: comprimento e volta inteira. */
  tracejado: string;
  /** Fração preenchida, de 0 a 1 — onde fica a ponta do arco. */
  fracao: number;
  /** `strokeDasharray` do trilho: a volta inteira, ou só o trecho do arco aberto. */
  trilho: string | undefined;
  /** Quanto da volta o anel ocupa. */
  arco: number;
  /** Ângulo de partida do traço, em graus a partir das três horas. */
  inicio: number;
}

interface MedidaDoAnel {
  valor: number;
  meta: number;
  arco: number;
}

function geometriaDoAnel(
  lado: number,
  margem: number,
  espessura: number,
  { valor, meta, arco }: MedidaDoAnel
): GeometriaDoAnel {
  const raio = (lado - espessura) / 2;
  const perimetro = 2 * Math.PI * raio;
  const fracao = fracaoPreenchida(valor, meta) / VOLTA_COMPLETA;
  return {
    centro: lado / 2 + margem,
    raio,
    espessura,
    tracejado: `${fracao * perimetro * arco} ${perimetro}`,
    fracao,
    trilho: arco >= 1 ? undefined : `${perimetro * arco} ${perimetro}`,
    arco,
    inicio: inicioDoTraco(arco),
  };
}

interface TracosProps {
  geometria: GeometriaDoAnel;
  camadas: Camada[];
  traco: string;
  trilho: string;
  pontilhado: boolean;
}

/** Brilho por baixo, trilho, e o arco por cima — a ordem é a do `drop-shadow`. */
function Tracos({ geometria, camadas, traco, trilho, pontilhado }: TracosProps) {
  const escalar = useEscala();
  const { centro, raio, espessura, tracejado } = geometria;
  const circulo = { cx: centro, cy: centro, r: raio, fill: 'none' } as const;

  return (
    <>
      {camadas.map(([meiaLargura, opacidade]) => (
        <Circle
          key={meiaLargura}
          {...circulo}
          stroke={traco}
          strokeOpacity={opacidade}
          strokeWidth={escalar(meiaLargura * 2)}
          strokeLinecap="round"
          strokeDasharray={tracejado}
        />
      ))}
      <Circle
        {...circulo}
        stroke={trilho}
        strokeWidth={espessura}
        strokeLinecap={pontilhado || geometria.trilho ? 'round' : undefined}
        strokeDasharray={pontilhado ? PONTILHADO.map(escalar).join(' ') : geometria.trilho}
      />
      <Circle
        {...circulo}
        stroke={traco}
        strokeWidth={espessura}
        strokeLinecap="round"
        strokeDasharray={tracejado}
      />
    </>
  );
}

/**
 * O ponto na ponta do arco, fora do SVG: o brilho dele é `boxShadow`, que o
 * React Native desenha de verdade, em vez de mais camadas empilhadas.
 *
 * A posição é calculada sem o giro do SVG — o ângulo já parte do início do traço.
 */
function PontoDaPonta({
  geometria,
  margem,
  cor,
}: {
  geometria: GeometriaDoAnel;
  margem: number;
  cor: string;
}) {
  const escalar = useEscala();
  const brilho = useBrilho();
  const raioDoPonto = escalar(RAIO_DO_PONTO);
  const graus = geometria.inicio + 360 * geometria.arco * geometria.fracao;
  const angulo = (graus * Math.PI) / 180;
  const centro = geometria.centro - margem;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: centro + geometria.raio * Math.cos(angulo) - raioDoPonto,
        top: centro + geometria.raio * Math.sin(angulo) - raioDoPonto,
        width: raioDoPonto * 2,
        height: raioDoPonto * 2,
        borderRadius: raioDoPonto,
        backgroundColor: cor,
        boxShadow: brilho({ blur: BRILHO_DO_PONTO }, { cor }),
      }}
    />
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
