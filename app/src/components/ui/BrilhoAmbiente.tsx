import { useColorScheme } from 'nativewind';
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useCores, useEscala } from '@/shared/design';

/**
 * A luz da primária atrás do conteúdo — o `.phone::after` do kit.
 *
 * No CSS do desenho ela é:
 *
 *     left:-15%; right:-15%; top:200px; height:340px;
 *     radial-gradient(50% 50% at 50% 50%, primary/.14 0%, transparent 70%);
 *     filter: blur(40px)
 *
 * O blur **não é detalhe**: ele é metade do desenho, e não há como pedi-lo
 * direto. O `filter: blur()` do React Native só existe no Android 12+ (no iOS
 * o `filter` aceita só `brightness` e `opacity`), e o `FeGaussianBlur` do
 * react-native-svg no Android usa RenderScript com raio travado em 25px de
 * bitmap — um décimo do que sigma 40 pede.
 *
 * O `blur(40px)` do CSS é gaussiano com desvio-padrão de 40, e sobre um cone
 * que já acaba em 70% do raio ele derruba o pico e espalha a luz para bem além
 * da caixa. Reproduzir só o gradiente dá uma mancha forte e com
 * contorno — foi o que a primeira versão desta tela mostrou.
 *
 * Então o que está aqui é **o resultado do blur, não o gradiente de origem**:
 * o cone do kit foi rasterizado a 1px, convoluído com a gaussiana de sigma 40
 * e medido nos dois eixos. Os dois perfis normalizados coincidem a menos de
 * 0,05, então um radial elíptico só os reproduz. Daí saem os números abaixo:
 *
 * - o pico cai a 64,8% do declarado — 14% vira 9,1% no escuro;
 * - a luz alcança 1% do pico a 229 do centro na horizontal e 182 na vertical.
 *
 * Conferido contra o Chrome renderizando o CSS do kit: pico `20,31,9` sobre o
 * fundo, contra `19,31,9` deste perfil.
 *
 * ## Por que o centro vem de fora
 *
 * No kit a luz está a `top: 200px` de um telefone de 820, e os blocos de
 * métrica começam em 366 — **o centro da luz (370) cai no topo dos blocos**. É
 * isso que a esconde: a metade de cima fica sobre a foto e a frase do dia, a de
 * baixo atrás do vidro dos blocos, e quase nada sobra no fundo escuro.
 *
 * A primeira versão posicionava a luz por fração da altura da tela. Numa tela
 * de 997dp, com o conteúdo medido em rem a partir do topo, os blocos subiam e a
 * metade de baixo da luz caía no vão antes de "Hoje" — e virava mancha. A
 * relação que o desenho define é com o conteúdo, então a tela mede onde os
 * blocos ficaram e entrega o ponto.
 *
 * ## Por que mora dentro do alvo do vidro
 *
 * O kit empilha foto (z0), luz (z1) e conteúdo (z2), e os cartões desfocam o
 * que está atrás deles — a luz inclusive. Dentro do `AlvoDoVidro` o Android
 * também a desfoca.
 *
 * @example
 * <AlvoDoVidro fundo={<><FundoDeFoto … /><BrilhoAmbiente topoDosBlocos={y} /></>}>
 *   <ScrollView>…</ScrollView>
 * </AlvoDoVidro>
 */
interface BrilhoAmbienteProps {
  /**
   * Onde fica o **topo dos blocos de métrica**, em dp a partir do topo da tela.
   * A luz se centra 4 abaixo dele, como no kit (370 contra 366).
   *
   * Tela sem blocos não passa nada, e a luz fica onde o kit a põe em qualquer
   * telefone: centro a 370 do topo, escalado como o resto do desenho.
   */
  topoDosBlocos?: number;
}

/** O centro da luz no kit, quando não há blocos para ancorá-la. */
const CENTRO_NO_KIT = 370;

/** No kit o centro da luz fica 4 abaixo do topo dos blocos: 370 contra 366. */
const DO_TOPO_DOS_BLOCOS_AO_CENTRO = 4;

/** Alcance vertical medido, do centro até 1% do pico. */
const ALCANCE_VERTICAL = 182;

/** Quanto do pico declarado sobra depois do `blur(40px)` sobre o cone do kit. */
const ATENUACAO_DO_BLUR = 0.648;

/** Pico no centro, por tema: o valor do kit, já atenuado pelo blur. */
const OPACIDADE = {
  escuro: 0.14 * ATENUACAO_DO_BLUR,
  claro: 0.1 * ATENUACAO_DO_BLUR,
} as const;

/**
 * O perfil medido, do centro (0) ao alcance (1), como fração do pico.
 *
 * É a média dos dois eixos. A última parada é zero, e não os 1% medidos: 1% de
 * 9% é invisível, e terminar em zero garante que não há borda onde a elipse
 * acaba.
 */
const PERFIL_DO_BLUR = [
  [0, 1],
  [0.1, 0.967],
  [0.2, 0.874],
  [0.3, 0.732],
  [0.4, 0.573],
  [0.5, 0.411],
  [0.6, 0.269],
  [0.7, 0.154],
  [0.8, 0.074],
  [0.9, 0.03],
  [1, 0],
] as const;

/**
 * As paradas do gradiente para um pico dado.
 *
 * @example paradasDoBrilho(0.09)[0] // { posicao: 0, opacidade: 0.09 }
 */
export function paradasDoBrilho(pico: number): { posicao: number; opacidade: number }[] {
  return PERFIL_DO_BLUR.map(([posicao, fracao]) => ({ posicao, opacidade: pico * fracao }));
}

export function BrilhoAmbiente({ topoDosBlocos }: BrilhoAmbienteProps) {
  const cores = useCores();
  const escalar = useEscala();
  const alcance = escalar(ALCANCE_VERTICAL);
  const centro =
    topoDosBlocos === undefined
      ? escalar(CENTRO_NO_KIT)
      : topoDosBlocos + escalar(DO_TOPO_DOS_BLOCOS_AO_CENTRO);
  const { colorScheme } = useColorScheme();
  const pico = colorScheme === 'dark' ? OPACIDADE.escuro : OPACIDADE.claro;
  // `useId` devolve ":r0:", e dois-pontos quebram a referência `url(#…)`.
  const id = `brilho${useId().replace(/:/g, '')}`;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="brilho-ambiente"
      /*
        Na horizontal a luz acompanha a largura, como no kit: 195 ± 229 de 390
        é −8,72% de cada lado. Na vertical ela acompanha o conteúdo, e por isso
        a posição é medida — não cabe em classe.
      */
      className="absolute left-[-8.72%] right-[-8.72%]"
      style={{ top: centro - alcance, height: alcance * 2 }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            {paradasDoBrilho(pico).map(({ posicao, opacidade }) => (
              <Stop
                key={posicao}
                offset={posicao}
                stopColor={cores.primary}
                stopOpacity={opacidade}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
