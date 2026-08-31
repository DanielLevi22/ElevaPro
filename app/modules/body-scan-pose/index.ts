import { requireNativeView } from 'expo';
import type { Ref } from 'react';
import type { ViewProps } from 'react-native';

/**
 * A preview de captura do Body scan, com pose e máscara rodando no aparelho.
 *
 * Emite fatos, nunca imagem: o frame morre no lado nativo e o que sobe é este
 * punhado de números, a cada dois segundos (`ADR-0022`).
 */

/**
 * O que a visão mede num frame.
 *
 * Nível do aparelho e vista pedida **não** estão aqui de propósito: o primeiro
 * vem do acelerômetro pelo `useDeviceLevel`, o segundo é a pose que a tela
 * pediu. Quem junta os três é a tela, e o resultado é o que o portão julga.
 */
export interface FatosDeVisao {
  /** Menor `visibility` entre os 33 landmarks. Baixo é corpo cortado ou ocluído. */
  visibilidadeMinima: number;
  /** Topo da silhueta em fração da altura do frame; `null` se a máscara não achou. */
  coroaY: number | null;
  /** Contato com o chão, mesma escala; `null` se a máscara não achou. */
  chaoY: number | null;
  /**
   * A pose que o frame representa, ou `null` quando não dá para decidir.
   *
   * Frente e costas são o caso frágil: o landmarker devolve os mesmos 33 pontos
   * nas duas, e o que separa é a visibilidade da face. Na dúvida vem `null`, e
   * o portão trata "não sei" como "não reprovo".
   */
  vistaDetectada: 'front' | 'back' | 'side' | null;
  /** Centro horizontal do corpo, em fração da largura; `null` sem silhueta. */
  centroX: number | null;
  /**
   * Fração da máscara que é corpo.
   *
   * Separa "não tem ninguém" de "tem alguém mal enquadrado": perto demais, a
   * visibilidade dos landmarks despenca porque cabeça e pés saem do quadro, e
   * sem este número o portão diria "não estou te vendo" para quem ocupa dois
   * terços da tela.
   */
  cobertura: number;
  /** Largura do corpo na altura dos ombros, em fração da largura do quadro. */
  larguraOmbros: number | null;
  /** Largura na altura do quadril, mesma escala. */
  larguraQuadril: number | null;
  /**
   * O aluno olha para a direita da imagem? `null` quando não dá para dizer.
   *
   * Só significa algo de perfil, e é o que traduz deslocamento horizontal em
   * "à frente" ou "para trás": de lado, o eixo horizontal do quadro é o eixo
   * frente-costas do corpo.
   */
  viradoParaDireita: boolean | null;
  /** Luminância média do frame, de 0 a 1. */
  lumaMedia: number;
  /** Luma do corpo dividida pela do fundo; `null` sem silhueta. Abaixo de 1 é contraluz. */
  contrasteCorpoFundo: number | null;
}

/** Onde a preview está no ciclo de vida. Texto para a tela, não para o portão. */
export interface EstadoDaPreview {
  estado: string;
}

/**
 * O que a tela chama pelo `ref`.
 *
 * A captura é a única operação: a preview e a medida acontecem sozinhas, e não
 * há nada para configurar depois de montada.
 */
/**
 * A medida de uma foto, em pixels e graus — nunca em centímetro.
 *
 * A conversão exige a altura do aluno, e o aparelho não a conhece de propósito:
 * o portão de elegibilidade responde se ele pode escanear e de onde viria a
 * Escala, nunca quanto. Quem divide é o BFF (`ADR-0022`).
 *
 * Campo nulo significa "não dá para medir nesta vista" — na lateral metade do
 * corpo se auto-oclui, e zero fingiria uma medida que não existe.
 */
export interface MedidaDaFoto {
  /** Altura do corpo em pixels, da coroa ao contato com o chão. A régua. */
  alturaPx: number;
  larguraPescocoPx: number | null;
  larguraPeitoPx: number | null;
  larguraCinturaPx: number | null;
  larguraQuadrilPx: number | null;
  larguraCoxaPx: number | null;
  larguraPanturrilhaPx: number | null;
  larguraOmbrosPx: number | null;
  /** Quanto um ombro está mais alto que o outro. Positivo: o direito do aluno. */
  desnivelOmbrosPx: number | null;
  desnivelQuadrilPx: number | null;
  inclinacaoOmbrosGraus: number | null;
  inclinacaoQuadrilGraus: number | null;
  /** Desvio do eixo nariz→tornozelos contra a vertical. */
  desvioDoEixoPx: number | null;
  /** Diferença de profundidade entre os ombros: diz se a frontal era frontal. */
  rotacaoDoTronco: number | null;
  /** Anteriorização de cabeça em graus. Só na lateral. */
  anguloCraniovertebralGraus: number | null;
  prumoOmbroPx: number | null;
  prumoQuadrilPx: number | null;
  prumoJoelhoPx: number | null;
}

export interface BodyScanPoseRef {
  /** Tira a foto em alta qualidade e devolve o `file://` dela no cache. */
  capturar(): Promise<string>;
  /**
   * Mede uma foto já tirada.
   *
   * Separado da captura de propósito: tirar e medir são trabalhos diferentes, e
   * juntá-los faria a foto depender de a medida dar certo. Falhando a medida, a
   * foto continua válida — a análise só perde a geometria.
   */
  medir(caminho: string, dePerfil: boolean): Promise<MedidaDaFoto>;
}

export interface BodyScanPoseViewProps extends ViewProps {
  /** React 19 trata `ref` como prop comum, e `requireNativeView` não a declara. */
  ref?: Ref<BodyScanPoseRef>;
  /** Lente frontal. A traseira é o padrão: é a que o aluno usa apoiando o aparelho. */
  lenteFrontal?: boolean;
  onFatos?: (evento: { nativeEvent: FatosDeVisao }) => void;
  onEstado?: (evento: { nativeEvent: EstadoDaPreview }) => void;
}

export default requireNativeView<BodyScanPoseViewProps>('BodyScanPose');
