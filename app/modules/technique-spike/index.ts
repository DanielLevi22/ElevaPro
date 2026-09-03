import { requireNativeView } from 'expo';
import type { Ref } from 'react';
import type { ViewProps } from 'react-native';

/**
 * A câmera da Análise de Técnica (issue #194).
 *
 * Nasceu como spike de medida e virou o módulo da feature ao passar a emitir as
 * posições articulares — é o que o `ADR-0022` previu para este consumidor.
 * **A pasta ainda se chama `technique-spike` e precisa ser renomeada**; o
 * rename foi tentado e barrado por um lock de arquivo do watcher.
 *
 * O que sobe daqui é de dois tipos, e eles servem a coisas diferentes:
 * `onMedida` é o overlay de diagnóstico — fps, percentis, térmico —, e `onPose`
 * são os landmarks que alimentam o julgador de `@elevapro/shared`.
 *
 * **Nada é gravado e nada sai do aparelho.** O boneco de palito atravessa para
 * o JS e morre no quadro seguinte.
 */

/** O resumo de uma janela de um segundo. */
export interface Medida {
  /** Passes concluídos na janela. */
  passes: number;
  /**
   * Quantos desses passes devolveram os 33 landmarks.
   *
   * É o campo que decide se o resto vale alguma coisa. O spike anterior
   * (`ADR-0022`) mediu latência contra imagem vazia: o detector rejeitou o
   * frame, o estágio de landmark nunca rodou, e o número não respondeu nada.
   * `p95` bonito com `comCorpo` em zero é medida do detector recusando.
   */
  comCorpo: number;
  /** Taxa efetiva sustentada na janela. */
  fps: number;
  /** Mediana da duração do passe, em ms — do frame chegar ao resultado sair. */
  p50: number;
  p95: number;
  /** `GPU` ou `CPU`. O número não significa nada sem isto. */
  delegate: string;
  /** Estado térmico do aparelho: `none`, `light`, `moderate`, `severe`... */
  termico: string;
  /** Só para conferir a olho que o corpo certo está sendo lido. */
  quadrilY: number | null;
  joelhoY: number | null;
  tornozeloY: number | null;
}

export interface EstadoDoSpike {
  estado: string;
}

/**
 * Um landmark do BlazePose, em coordenada normalizada.
 *
 * Estrutura idêntica a `LandmarkNormalizado` de `@elevapro/shared`, e é de
 * propósito: o que sobe do nativo entra no julgador sem tradução, e não existe
 * camada onde trocar x por y.
 */
export interface PontoDaPose {
  x: number;
  y: number;
  visibility: number;
}

/**
 * Os 33 landmarks de um quadro.
 *
 * `pontos` vazio é informação, não ausência: significa que o passe rodou e o
 * modelo não achou ninguém. Sem essa distinção, "não vejo você" e "o pipeline
 * parou" chegariam aqui como a mesma coisa — o silêncio.
 */
export interface Pose {
  pontos: PontoDaPose[];
  /** O carimbo do passe, para descartar resultado que chegar fora de ordem. */
  carimbo: number;
}

export interface TechniqueSpikeProps extends ViewProps {
  ref?: Ref<unknown>;
  onMedida?: (evento: { nativeEvent: Medida }) => void;
  onPose?: (evento: { nativeEvent: Pose }) => void;
  onEstado?: (evento: { nativeEvent: EstadoDoSpike }) => void;
}

export const TechniqueSpikeView = requireNativeView<TechniqueSpikeProps>('TechniqueSpike');
