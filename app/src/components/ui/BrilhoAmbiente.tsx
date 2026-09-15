import { useColorScheme } from 'nativewind';
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { cn } from '@/lib/utils';
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
type Perfil = readonly (readonly [posicao: number, fracao: number])[];

/**
 * Onde e quão forte a luz fica, já medida depois do `filter: blur()` do kit.
 *
 * O kit desenha a luz em dois lugares, com caixa e blur diferentes, e o blur
 * muda o perfil inteiro — não dá para derivar uma da outra por escala. Cada
 * receita é o cone daquela tela rasterizado, convoluído com a gaussiana dela e
 * medido nos dois eixos.
 */
export interface ReceitaDoBrilho {
  /** O centro da luz a partir do topo da tela, no desenho. */
  centro: number;
  /** Do centro até 1% do pico, na vertical. */
  alcanceVertical: number;
  /** A largura: o alcance horizontal como sobra de cada lado, em classe literal. */
  largura: string;
  /** Pico no centro, por tema: o valor do kit já atenuado pelo blur. */
  pico: { escuro: number; claro: number };
  /** Do centro (0) ao alcance (1), como fração do pico. Média dos dois eixos. */
  perfil: Perfil;
}

/**
 * A luz da tela inicial e das telas com foto:
 *
 *     left:-15%; right:-15%; top:200px; height:340px;
 *     radial-gradient(50% 50% at 50% 50%, primary/.14 0%, transparent 70%);
 *     filter: blur(40px)
 *
 * O blur derruba o pico a 64,8% do declarado, e a luz alcança 1% a 229 do
 * centro na horizontal (195 ± 229 de 390 é −8,72% de cada lado) e 182 na
 * vertical. Conferido contra o Chrome renderizando o CSS do kit: pico
 * `20,31,9` sobre o fundo, contra `19,31,9` deste perfil.
 *
 * A última parada é zero, e não os 1% medidos: 1% de 9% é invisível, e terminar
 * em zero garante que não há borda onde a elipse acaba.
 */
export const BRILHO_DA_HOME: ReceitaDoBrilho = {
  centro: 370,
  alcanceVertical: 182,
  largura: 'left-[-8.72%] right-[-8.72%]',
  pico: { escuro: 0.14 * 0.648, claro: 0.1 * 0.648 },
  perfil: [
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
  ],
};

/**
 * A luz do fluxo de nutrição, que fica no topo e não atrás de blocos:
 *
 *     left:-15%; right:-15%; top:-60px; height:420px;
 *     radial-gradient(50% 50% at 50% 50%, primary/.18 0%, transparent 70%);
 *     filter: blur(30px)          (claro: primary/.13)
 *
 * O centro fica a 150 do topo (−60 + 210). Com sigma 30 sobre esse cone o pico
 * cai a 76,6% do declarado, e a luz alcança 1% a 214 na horizontal (195 ± 214
 * de 390 é −4,87% de cada lado) e 186 na vertical; os dois perfis coincidem a
 * menos de 0,03.
 */
export const BRILHO_DA_NUTRICAO: ReceitaDoBrilho = {
  centro: 150,
  alcanceVertical: 186,
  largura: 'left-[-4.87%] right-[-4.87%]',
  pico: { escuro: 0.18 * 0.766, claro: 0.13 * 0.766 },
  perfil: [
    [0, 1],
    [0.1, 0.967],
    [0.2, 0.878],
    [0.3, 0.753],
    [0.4, 0.611],
    [0.5, 0.462],
    [0.6, 0.317],
    [0.7, 0.188],
    [0.8, 0.092],
    [0.9, 0.035],
    [1, 0],
  ],
};

/**
 * A luz do fluxo de cardio, também no topo, mais larga e mais forte:
 *
 *     left:-20%; right:-20%; top:-40px; height:460px;
 *     radial-gradient(50% 50% at 50% 50%, primary/.2 0%, transparent 70%);
 *     filter: blur(34px)          (claro: primary/.14)
 *
 * Medida pelo mesmo método, que reproduz a receita da nutrição a menos de 0,001:
 * centro a 190 (−40 + 230), pico a 75,6% do declarado, e a luz alcança 1% a 232
 * na horizontal (195 ± 232 de 390 é −9,49% de cada lado) e 206 na vertical; os
 * dois perfis coincidem a menos de 0,04.
 */
export const CARDIO_GLOW: ReceitaDoBrilho = {
  centro: 190,
  alcanceVertical: 206,
  largura: 'left-[-9.49%] right-[-9.49%]',
  pico: { escuro: 0.2 * 0.756, claro: 0.14 * 0.756 },
  perfil: [
    [0, 1],
    [0.1, 0.966],
    [0.2, 0.878],
    [0.3, 0.75],
    [0.4, 0.608],
    [0.5, 0.457],
    [0.6, 0.311],
    [0.7, 0.186],
    [0.8, 0.089],
    [0.9, 0.035],
    [1, 0],
  ],
};

interface BrilhoAmbienteProps {
  /**
   * Onde fica o **topo dos blocos de métrica**, em dp a partir do topo da tela.
   * A luz se centra 4 abaixo dele, como no kit (370 contra 366).
   *
   * Tela sem blocos não passa nada, e a luz fica no centro da receita,
   * escalado como o resto do desenho.
   */
  topoDosBlocos?: number;
  receita?: ReceitaDoBrilho;
}

/** No kit o centro da luz fica 4 abaixo do topo dos blocos: 370 contra 366. */
const DO_TOPO_DOS_BLOCOS_AO_CENTRO = 4;

/**
 * As paradas do gradiente para um pico dado.
 *
 * @example paradasDoBrilho(0.09)[0] // { posicao: 0, opacidade: 0.09 }
 */
export function paradasDoBrilho(
  pico: number,
  perfil: Perfil = BRILHO_DA_HOME.perfil
): { posicao: number; opacidade: number }[] {
  return perfil.map(([posicao, fracao]) => ({ posicao, opacidade: pico * fracao }));
}

export function BrilhoAmbiente({ topoDosBlocos, receita = BRILHO_DA_HOME }: BrilhoAmbienteProps) {
  const cores = useCores();
  const escalar = useEscala();
  const alcance = escalar(receita.alcanceVertical);
  const centro =
    topoDosBlocos === undefined
      ? escalar(receita.centro)
      : topoDosBlocos + escalar(DO_TOPO_DOS_BLOCOS_AO_CENTRO);
  const { colorScheme } = useColorScheme();
  const pico = colorScheme === 'dark' ? receita.pico.escuro : receita.pico.claro;
  // `useId` devolve ":r0:", e dois-pontos quebram a referência `url(#…)`.
  const id = `brilho${useId().replace(/:/g, '')}`;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="brilho-ambiente"
      /*
        Na horizontal a luz acompanha a largura, como no kit. Na vertical ela
        acompanha o conteúdo, e por isso a posição é medida — não cabe em classe.
      */
      className={cn('absolute', receita.largura)}
      style={{ top: centro - alcance, height: alcance * 2 }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            {paradasDoBrilho(pico, receita.perfil).map(({ posicao, opacidade }) => (
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
