import { requireNativeView } from 'expo';
import type { Ref } from 'react';
import type { ViewProps } from 'react-native';

/**
 * Spike descartável da issue #194. **Não é a feature.**
 *
 * Mede quanto custa um passe do PoseLandmarker sem máscara de segmentação e com
 * delegate de GPU, sustentado por minutos. Sem regra, sem contagem de
 * repetição, sem voz, sem consentimento. Apagar depois de medir.
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

export interface TechniqueSpikeProps extends ViewProps {
  ref?: Ref<unknown>;
  onMedida?: (evento: { nativeEvent: Medida }) => void;
  onEstado?: (evento: { nativeEvent: EstadoDoSpike }) => void;
}

export const TechniqueSpikeView = requireNativeView<TechniqueSpikeProps>('TechniqueSpike');
