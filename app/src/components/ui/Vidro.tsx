import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { PixelRatio, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { METODO_DE_BLUR, useAlvoDoVidro } from './AlvoDoVidro';

/**
 * A superfície de vidro fosco do kit.
 *
 * No CSS do desenho isso é uma declaração de sete propriedades. Em React Native
 * nenhuma das três principais existe, então a superfície é uma composição:
 *
 * | no desenho                      | aqui                                   |
 * |---------------------------------|----------------------------------------|
 * | `backdrop-filter: blur(26px)`   | `BlurView` do expo-blur                |
 * | `saturate(140%)`                | `filter: saturate(1.4)` (Android)      |
 * | `linear-gradient(160deg, …)`    | `LinearGradient` com o vetor de 160°   |
 * | `::before` radial de brilho     | removido — quebrava a simetria         |
 * | `inset 0 1px 0` (topo)          | uma linha de 1px no topo               |
 * | `inset 0 -1px 0` (base)         | uma linha de 1px na base               |
 * | duas sombras externas           | as duas, com `boxShadow`               |
 *
 * Por isso ela é **um componente**, e não uma classe repetida: são cinco
 * camadas, e repeti-las à mão em cada cartão seria errar em pelo menos uma.
 *
 * @example
 * <Vidro className="p-3.5">
 *   <Text className="text-foreground">…</Text>
 * </Vidro>
 */
interface VidroProps extends ViewProps {
  children: ReactNode;
  /** Mais opaco: o kit usa isso em trilho de progresso e fundo de ícone. */
  forte?: boolean;
  /**
   * Layout **de dentro**: o arranjo dos filhos e o preenchimento.
   *
   * São duas camadas porque no iOS `overflow: hidden` corta a sombra — a de
   * fora carrega o relevo e a de dentro recorta as camadas de vidro.
   */
  className?: string;
  /** Layout **do próprio cartão** na fila onde ele está: `flex-1`, largura. */
  classeExterna?: string;
}

/**
 * O blur, e a correção de um diagnóstico meu.
 *
 * Eu medi o vidro contra o app chapado e achei 44% de frames perdidos contra
 * 3,85%, e concluí que o `BlurView` era o culpado. Estava errado: o `expo-blur`
 * nasce com `blurMethod: 'none'` no Android, e os métodos reais exigem a prop
 * `blurTarget` — sem ela o pacote volta para `'none'`. **O blur nunca esteve
 * ligado no Android.**
 *
 * O custo era das camadas: um `Svg` por cartão, com o mesmo `id` de gradiente
 * em todos. Tirando-o, o jank caiu a 23,53% e os percentis voltaram para junto
 * do baseline — p99 até melhor, 30 ms contra 38 ms.
 *
 *     medição              | janky  | p90   | p95   | p99
 *     app chapado          |  3,85% | 23 ms | 26 ms | 38 ms
 *     vidro com Svg/cartão | 44,44% | 42 ms | 48 ms | 61 ms
 *     vidro sem o Svg      | 23,53% | 26 ms | 29 ms | 30 ms
 *
 * Com o alvo declarado, o Android usa `dimezisBlurViewSdk31Plus`, que é o
 * `RenderEffect` — o caminho de GPU. **E o alvo precisa chegar**: na primeira
 * versão do `AlvoDoVidro` os cartões ficavam fora do provedor e recebiam `null`,
 * e o blur continuou desligado por mais um commit. Vale remedir o custo agora
 * que ele de fato existe.
 */

/** Intensidade do `BlurView` no iOS, onde ela é a própria força do material. */
const INTENSIDADE_NO_IOS = 26;

/**
 * O `backdrop-filter: blur(26px) saturate(140%)` do kit, no Android.
 *
 * Lido no código do expo-blur 57 e do Dimezis BlurView 3.1.0, que ele usa:
 *
 * - **raio**: o expo-blur passa `intensity / blurReductionFactor`, e o Dimezis
 *   aplica `RenderEffect.createBlurEffect(raio × 4)` em pixel físico. Com os
 *   padrões (26 / 4 × 4) isso era 26px — sigma de ~5dp, contra os ~30dp que o
 *   `blur(26px)` pede na nossa escala. A foto atravessava o vidro quase nítida
 *   e sujava os blocos de marrom;
 * - **tinta**: o `tint` pinta `rgb(25,25,25)` com alfa `intensity × 0,69%`
 *   por cima do blur. O kit não tem essa camada, e ela acinzentava o verde da
 *   luz ambiente. Com `intensity` 1 ela vai a 1/255, e o raio passa a vir todo
 *   do `blurReductionFactor`;
 * - **saturação**: o `saturate(140%)` vira `filter: saturate(1.4)` na própria
 *   view do blur — só o que é desfocado satura, como no CSS. É ele que faz a
 *   luz verde ler como cor dentro do vidro, e não como cinza.
 */
const SIGMA_DO_KIT = 26;
const SATURACAO_DO_KIT = 1.4;
const INTENSIDADE_NO_ANDROID = 1;
/** O Dimezis multiplica o raio por este fator antes do `RenderEffect`. */
const FATOR_DO_DIMEZIS = 4;

/**
 * O `blurReductionFactor` que entrega o sigma do kit no Android.
 *
 * O Skia, que desenha o `RenderEffect`, converte raio em sigma por
 * `sigma = raio × 0,57735 + 0,5`; a conta abaixo é o inverso.
 *
 * @example reducaoParaOSigma(30, 3) // ≈ 0,026 com intensity 1
 */
export function reducaoParaOSigma(sigmaEmDp: number, densidade: number): number {
  const sigmaEmPx = sigmaEmDp * densidade;
  const raioDoRenderEffect = (sigmaEmPx - 0.5) / 0.57735;
  return INTENSIDADE_NO_ANDROID / (raioDoRenderEffect / FATOR_DO_DIMEZIS);
}

/**
 * O relevo do vidro: as duas sombras do kit, com `boxShadow`.
 *
 *     escuro: 0 10px 26px -10px rgba(0,0,0,.55), 0 2px 6px -2px rgba(0,0,0,.35)
 *     claro:  0 8px 20px -10px rgba(16,18,24,.22), 0 2px 5px -2px rgba(16,18,24,.12)
 *
 * `boxShadow` é estilo nativo da New Architecture (Android 9+ e iOS), com a
 * sintaxe e a semântica do CSS — várias sombras, espalhamento negativo, e
 * **desenhada só fora da caixa**.
 *
 * Esse último ponto é o motivo da troca. Antes a sombra vinha de `elevation`,
 * que no Android só existe com fundo pintado, e o invólucro era pintado com a
 * cor da tela. Isso deixava o vidro **opaco no Android**: medido no aparelho, o
 * miolo de dois blocos saía no mesmo `37,38,40` enquanto o vão entre eles tinha
 * a luz ambiente em `17,25,8`. A luz aparecia só nas frestas, e virava mancha.
 * Com `boxShadow` não há fundo nenhum, e o que está atrás atravessa o vidro.
 *
 * A sombra de contato, que o `elevation` perdia, volta: são as duas do kit.
 */
type Sombra = { y: number; blur: number; espalhamento: number; alfa: number };

const SOMBRAS: Record<'escuro' | 'claro', Sombra[]> = {
  escuro: [
    { y: 10, blur: 26, espalhamento: -10, alfa: 0.55 },
    { y: 2, blur: 6, espalhamento: -2, alfa: 0.35 },
  ],
  claro: [
    { y: 8, blur: 20, espalhamento: -10, alfa: 0.22 },
    { y: 2, blur: 5, espalhamento: -2, alfa: 0.12 },
  ],
};

/**
 * O token de sombra traz só a cor (`rgb(…)`); a força é de cada camada do kit.
 *
 * @example comAlfa('rgb(0, 0, 0)', 0.55) // 'rgba(0, 0, 0, 0.55)'
 */
function comAlfa(rgb: string, alfa: number): string {
  return rgb.replace('rgb(', 'rgba(').replace(')', `, ${alfa})`);
}

/**
 * O preenchimento desce reto, e o kit usa 160°.
 *
 * São 20° de diferença, e eles são deliberados: qualquer inclinação faz um lado
 * do cartão ficar mais claro que o outro, e numa lista de dez linhas a assimetria
 * vira o defeito que se vê antes do efeito. O mesmo motivo tirou o brilho de
 * canto — no kit ele é um radial a 14% no canto superior esquerdo, imperceptível
 * sobre vidro translúcido em CSS e visível demais aqui.
 *
 * O que o vidro é, então: o gradiente vertical, a borda, as duas linhas de
 * brilho e a sombra de relevo. Simétrico da esquerda para a direita.
 */
const INICIO_DO_GRADIENTE = { x: 0.5, y: 0 };
const FIM_DO_GRADIENTE = { x: 0.5, y: 1 };

export function Vidro({ children, forte = false, className, classeExterna, ...props }: VidroProps) {
  const cores = useCores();
  const escalar = useEscala();
  const alvo = useAlvoDoVidro();
  const { colorScheme } = useColorScheme();
  const escuro = colorScheme === 'dark';

  return (
    <View
      style={{
        boxShadow: SOMBRAS[escuro ? 'escuro' : 'claro'].map((sombra) => ({
          offsetX: 0,
          offsetY: escalar(sombra.y),
          blurRadius: escalar(sombra.blur),
          spreadDistance: escalar(sombra.espalhamento),
          color: comAlfa(cores.sombra, sombra.alfa),
        })),
      }}
      className={cn('rounded-xl', classeExterna)}
    >
      <View
        className={cn('overflow-hidden rounded-xl border border-glass-border', className)}
        {...props}
      >
        {/*
          No iOS o blur não precisa de alvo. No Android sem alvo ele não
          desfocaria nada, e renderizar a view por nada é custo puro.
        */}
        {Platform.OS === 'ios' || alvo ? (
          <BlurView
            intensity={Platform.OS === 'ios' ? INTENSIDADE_NO_IOS : INTENSIDADE_NO_ANDROID}
            blurReductionFactor={reducaoParaOSigma(escalar(SIGMA_DO_KIT), PixelRatio.get())}
            tint={escuro ? 'dark' : 'light'}
            blurMethod={METODO_DE_BLUR}
            blurTarget={alvo ?? undefined}
            style={[
              StyleSheet.absoluteFill,
              Platform.OS === 'android' ? { filter: [{ saturate: SATURACAO_DO_KIT }] } : null,
            ]}
          />
        ) : null}

        <LinearGradient
          colors={
            forte
              ? [cores.glassStrong, cores.glassStrong]
              : [cores.glassTop, cores.glass, cores.glassBottom]
          }
          locations={forte ? [0, 1] : [0, 0.55, 1]}
          start={INICIO_DO_GRADIENTE}
          end={FIM_DO_GRADIENTE}
          className="absolute inset-0"
        />

        {/* As duas linhas que no desenho são `inset box-shadow`. */}
        <View className="absolute left-0 right-0 top-0 h-px bg-specular" />
        {escuro ? (
          <View className="absolute bottom-0 left-0 right-0 h-px bg-specular-bottom" />
        ) : null}

        {children}
      </View>
    </View>
  );
}

export type { VidroProps };
