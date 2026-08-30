/**
 * O portão de captura do Body scan.
 *
 * Decide, a cada frame amostrado, se o disparo pode sair e o que dizer ao aluno
 * quando não pode. Puro de propósito: a política de captura é a regra que a
 * tela, a voz e o registro do scan precisam responder igual, e com ela pura os
 * casos difíceis — contraluz com ombro torto e corpo cortado, juntos — se
 * constroem como objeto em vez de fotografia (`ADR-0022`).
 */

export type Vista = 'front' | 'back' | 'side';

/**
 * Marcas do Enquadramento, em fração da altura do frame. São as mesmas de
 * sempre: encaixando o corpo entre elas, a distância até a câmera se repete
 * entre dois scans, que é do que a comparação depende (`ADR-0010`).
 */
const MARCA_TOPO = 0.1;
const MARCA_BASE = 0.9;
const ALTURA_ALVO = MARCA_BASE - MARCA_TOPO;

/**
 * Quanto o corpo pode ocupar a mais ou a menos sem virar instrução.
 *
 * Larga o bastante para o aluno não ser mandado andar por um centímetro, e
 * estreita o bastante para o Enquadramento continuar reproduzível.
 */
const TOLERANCIA_ALTURA = 0.06;

/**
 * Visibilidade mínima dos 33 landmarks, por vista.
 *
 * Em perfil metade do corpo se auto-oclui, e a MediaPipe rebaixa a visibilidade
 * do lado escondido. Aplicar o limiar da frontal na lateral reprovaria foto boa
 * para sempre — por isso a lateral tem o seu.
 */
const VISIBILIDADE_MINIMA = { frontal: 0.6, lateral: 0.35 };

/** Graus de inclinação a partir dos quais a foto sai torta o bastante. */
const INCLINACAO_MAXIMA = 6;

const LUMA_ESCURA = 0.12;
const LUMA_ESTOURADA = 0.92;

/** Abaixo disto o corpo é mais escuro que o fundo: silhueta sem largura medível. */
const CONTRASTE_MINIMO = 0.5;

/** O que o módulo nativo mediu num frame. Só o que o portão precisa julgar. */
export interface FatosDaCaptura {
  /** A pose que a tela pediu. */
  vistaPedida: Vista;
  /** A pose que o frame representa, ou `null` quando não deu para decidir. */
  vistaDetectada: Vista | null;
  /** Menor `visibility` entre os 33 landmarks. */
  visibilidadeMinima: number;
  /** Topo da silhueta em fração da altura do frame; `null` se a máscara não achou. */
  coroaY: number | null;
  /** Contato com o chão, mesma escala; `null` se a máscara não achou. */
  chaoY: number | null;
  pitch: number;
  roll: number;
  /** Falso quando o aparelho não tem sensor — aí pitch e roll não valem nada. */
  nivelDisponivel: boolean;
  /** Luminância média do frame, de 0 a 1. */
  lumaMedia: number;
  /** Luma do corpo dividida pela do fundo; `null` sem silhueta. Abaixo de 1 é contraluz. */
  contrasteCorpoFundo: number | null;
}

export type IdDaInstrucao = 'corpo-cortado' | 'vista-errada' | 'aproxime' | 'afaste' | 'nivel';

export interface Instrucao {
  /** Identidade estável — é por ela que o portão sabe se já falou isto. */
  id: IdDaInstrucao;
  /** O que a voz diz e a tela mostra. */
  texto: string;
}

/** Sinal que degrada a análise sem invalidá-la. Vai para o registro do scan. */
export type AvisoDeQualidade = 'contraluz' | 'luz-fraca' | 'luz-estourada';

export interface Portao {
  liberado: boolean;
  /** A instrução de maior prioridade, ou `null` quando está tudo certo. */
  instrucao: Instrucao | null;
  /** Falso quando a instrução é a mesma da última falada — silêncio é informação. */
  deveFalar: boolean;
  avisos: AvisoDeQualidade[];
}

const TEXTOS: Record<IdDaInstrucao, string> = {
  'corpo-cortado': 'Seu corpo inteiro precisa aparecer. Centralize ou afaste-se.',
  'vista-errada': 'Vire para a posição pedida.',
  aproxime: 'Aproxime-se até a cabeça e os pés chegarem nas marcas.',
  afaste: 'Afaste-se até o corpo inteiro caber entre as marcas.',
  nivel: 'Endireite o aparelho.',
};

const nomeiaVista = (vista: Vista): string =>
  ({ front: 'de frente', back: 'de costas', side: 'de lado' })[vista];

/** O corpo inteiro está no quadro? Sem isso não há o que medir nem o que analisar. */
function corpoCortado(fatos: FatosDaCaptura): boolean {
  const limiar =
    fatos.vistaPedida === 'side' ? VISIBILIDADE_MINIMA.lateral : VISIBILIDADE_MINIMA.frontal;

  // Máscara sem coroa ou sem contato com o chão cai aqui de propósito: para o
  // aluno é o mesmo problema — parte dele não está no quadro.
  if (fatos.coroaY === null || fatos.chaoY === null) return true;

  return fatos.visibilidadeMinima < limiar;
}

/** A pose bate com a que a tela pediu? `null` é "não deu para decidir", não "errado". */
function vistaErrada(fatos: FatosDaCaptura): boolean {
  if (fatos.vistaDetectada === null) return false;

  return fatos.vistaDetectada !== fatos.vistaPedida;
}

/** Quanto da altura do frame o corpo ocupa, ou `null` sem silhueta. */
function alturaOcupada(fatos: FatosDaCaptura): number | null {
  if (fatos.coroaY === null || fatos.chaoY === null) return null;

  return fatos.chaoY - fatos.coroaY;
}

function foraDeNivel(fatos: FatosDaCaptura): boolean {
  if (!fatos.nivelDisponivel) return false;

  return Math.abs(fatos.pitch) > INCLINACAO_MAXIMA || Math.abs(fatos.roll) > INCLINACAO_MAXIMA;
}

/**
 * A primeira falha da cascata, ou `null` quando a geometria está inteira.
 *
 * A ordem vai da checagem que invalida a foto para a que apenas degrada: corpo
 * cortado não tem o que medir, aparelho torto ainda mede — só pior. Invertida,
 * a cascata mandaria o aluno endireitar o celular para continuar cortado.
 */
function primeiraFalha(fatos: FatosDaCaptura): IdDaInstrucao | null {
  if (corpoCortado(fatos)) return 'corpo-cortado';
  if (vistaErrada(fatos)) return 'vista-errada';

  const ocupada = alturaOcupada(fatos);
  if (ocupada !== null) {
    if (ocupada < ALTURA_ALVO - TOLERANCIA_ALTURA) return 'aproxime';
    if (ocupada > ALTURA_ALVO + TOLERANCIA_ALTURA) return 'afaste';
  }

  if (foraDeNivel(fatos)) return 'nivel';

  return null;
}

/**
 * Sinais que não travam.
 *
 * Luz ruim é registrada e vira aviso depois da captura: o aluno às dez da noite
 * pode não ter como resolver o contraluz do quarto, e scan marcado vale mais
 * que scan que não aconteceu. O precedente é o `framing_level_sensor`, que já
 * significa "este sinal não conta para este scan".
 */
function avisosDeQualidade(fatos: FatosDaCaptura): AvisoDeQualidade[] {
  const avisos: AvisoDeQualidade[] = [];

  if (fatos.lumaMedia < LUMA_ESCURA) avisos.push('luz-fraca');
  if (fatos.lumaMedia > LUMA_ESTOURADA) avisos.push('luz-estourada');
  if (fatos.contrasteCorpoFundo !== null && fatos.contrasteCorpoFundo < CONTRASTE_MINIMO) {
    avisos.push('contraluz');
  }

  return avisos;
}

function montarInstrucao(id: IdDaInstrucao, fatos: FatosDaCaptura): Instrucao {
  if (id !== 'vista-errada') return { id, texto: TEXTOS[id] };

  return { id, texto: `Fique ${nomeiaVista(fatos.vistaPedida)} para a câmera.` };
}

/**
 * Decide o disparo e o que dizer.
 *
 * @param ultimaFalada id da última instrução dita em voz, ou `null`. É por ela
 * que `deveFalar` cala a repetição: a mesma frase a cada dois segundos vira
 * ruído, e ruído ensina o aluno a ignorar o resto.
 *
 * @example
 * const { liberado, instrucao, deveFalar } = avaliarPortao(fatos, ultimaFalada);
 * if (deveFalar && instrucao) voz.speak(instrucao.texto);
 */
export function avaliarPortao(fatos: FatosDaCaptura, ultimaFalada: IdDaInstrucao | null): Portao {
  const falha = primeiraFalha(fatos);
  const avisos = avisosDeQualidade(fatos);

  if (falha === null) {
    return { liberado: true, instrucao: null, deveFalar: false, avisos };
  }

  return {
    liberado: false,
    instrucao: montarInstrucao(falha, fatos),
    deveFalar: falha !== ultimaFalada,
    avisos,
  };
}
