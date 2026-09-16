/**
 * Os tipos do portão de captura, fora do `portao.ts` para ele caber no limite
 * de tamanho (#316). Quem usa importa de `./portao`, que os reexporta.
 */

export type Vista = 'front' | 'back' | 'side';

/** O que o módulo nativo mediu num frame. Só o que o portão precisa julgar. */
export interface FatosDaCaptura {
  /** A pose que a tela pediu. */
  vistaPedida: Vista;
  /** A pose que o frame representa, ou `null` quando não deu para decidir. */
  vistaDetectada: Vista | null;
  /** Menor `visibility` entre os landmarks que marcam os extremos do corpo. */
  visibilidadeMinima: number;
  /** Fração da máscara que é corpo. Diz que HÁ alguém, mesmo mal enquadrado. */
  cobertura: number;
  /** Topo da silhueta em fração da altura do frame; `null` se a máscara não achou. */
  coroaY: number | null;
  /** Contato com o chão, mesma escala; `null` se a máscara não achou. */
  chaoY: number | null;
  /** Centro horizontal do corpo, em fração da largura; `null` sem silhueta. */
  centroX: number | null;
  /** O aluno olha para a direita da imagem? Só significa algo de perfil. */
  viradoParaDireita: boolean | null;
  pitch: number;
  roll: number;
  /** Falso quando o aparelho não tem sensor — aí pitch e roll não valem nada. */
  nivelDisponivel: boolean;
  /** Luminância média do frame, de 0 a 1. */
  lumaMedia: number;
  /** Luma do corpo dividida pela do fundo; `null` sem silhueta. Abaixo de 1 é contraluz. */
  contrasteCorpoFundo: number | null;
}

export type IdDaInstrucao =
  | 'sem-corpo'
  | 'cabeca-cortada'
  | 'pes-cortados'
  | 'va-para-esquerda'
  | 'va-para-direita'
  | 'passo-a-frente'
  | 'passo-atras'
  | 'vista-errada'
  | 'aproxime'
  | 'aproxime-muito'
  | 'afaste'
  | 'suba-o-celular'
  | 'baixe-o-celular'
  | 'nivel';

export interface Instrucao {
  /** Identidade estável — é por ela que o portão sabe se já falou isto. */
  id: IdDaInstrucao;
  /** O que a voz diz e a tela mostra. */
  texto: string;
}

/** Sinal que degrada a análise sem invalidá-la. Vai para o registro do scan. */
export type AvisoDeQualidade = 'contraluz' | 'luz-fraca' | 'luz-estourada';

/**
 * Quão perto do certo o aluno está.
 *
 * Existe porque a três metros da tela ele não lê frase nem enxerga traço fino —
 * o que ele percebe é cor em área grande. Três estados é o que a visão
 * periférica distingue sem esforço.
 */
export type Proximidade = 'longe' | 'quase' | 'pronto';

/** O que o portão precisa saber além do frame. */
export interface ContextoDoPortao {
  /**
   * Id da última instrução dita em voz. Por ela `deveFalar` cala a repetição:
   * a mesma frase a cada dois segundos vira ruído, e ruído ensina a ignorar.
   */
  ultimaFalada?: IdDaInstrucao | null;
  /**
   * O portão estava aberto na leitura anterior? Afrouxa as tolerâncias, para
   * quem já está parado no lugar não perder a foto por oscilar.
   */
  estavaLiberado?: boolean;
  /**
   * A contagem regressiva está rodando?
   *
   * Enquanto ela roda, a folga da histerese sai. As duas existem para coisas
   * opostas: a folga evita que o portão pisque enquanto o aluno se acomoda, e
   * a contagem é a promessa de que ele vai ficar parado. Somadas, o aluno saía
   * de posição e a foto saía mesmo assim — a tolerância ficava 50% mais larga
   * justo no momento em que devia estar mais estreita.
   */
  contando?: boolean;
  /** Há quanto tempo a voz falou. Passado o limite, repete mesmo sem mudar. */
  msDesdeAFala?: number;
  /**
   * Quanto do quadro o corpo ocupou na primeira foto deste scan.
   *
   * A partir da segunda pose o alvo deixa de ser a faixa larga e passa a ser
   * **este número**, com tolerância apertada: as três fotos precisam sair da
   * mesma distância. Escala igual entre elas é o que faz a largura da frente e
   * a da lateral descreverem o mesmo corpo, e não dois pontos de vista
   * diferentes (`ADR-0022`).
   */
  ocupacaoAlvo?: number | null;
}

export interface Portao {
  liberado: boolean;
  proximidade: Proximidade;
  /** Quanto do quadro o corpo ocupa. Vira a referência das poses seguintes. */
  ocupacao: number | null;
  /** A instrução de maior prioridade, ou `null` quando está tudo certo. */
  instrucao: Instrucao | null;
  /** Falso quando a instrução é a mesma da última falada — silêncio é informação. */
  deveFalar: boolean;
  avisos: AvisoDeQualidade[];
}
