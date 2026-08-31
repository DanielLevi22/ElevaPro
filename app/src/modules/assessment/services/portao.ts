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
 * Medido em aparelho (2026-08-31): um passo a dois ou três metros muda a
 * ocupação em muito mais que 0.06, então a faixa antiga fazia o aluno pular de
 * "aproxime" para "afaste" sem nunca acertar o meio.
 *
 * Alargar não custa a comparação **porque a escala deixou de ser assumida**:
 * ela era crítica enquanto as marcas eram a única régua, e agora o `px_per_cm`
 * é medido na silhueta. É o ADR-0022 pagando dividendo na usabilidade.
 *
 * 0.12 e não 0.10 porque a pessoa em pé oscila: com o limite em cima da posição
 * natural dela, o portão pisca entre aberto e fechado, e a contagem reinicia
 * sem parar.
 */
const TOLERANCIA_ALTURA = 0.12;

/**
 * Visibilidade mínima dos 33 landmarks, por vista.
 *
 * Em perfil metade do corpo se auto-oclui, e a MediaPipe rebaixa a visibilidade
 * do lado escondido. Aplicar o limiar da frontal na lateral reprovaria foto boa
 * para sempre — por isso a lateral tem o seu.
 *
 * Medidos em aparelho (Redmi Note 14 Pro, 2026-08-31): com o corpo inteiro bem
 * enquadrado de frente, o mínimo entre os extremos fica em 0.47–0.57. Os
 * chutes anteriores — 0.6 e 0.35 — barravam captura boa e nunca abriam.
 */
const VISIBILIDADE_MINIMA = { frontal: 0.35, lateral: 0.2 };

/**
 * Quanto o corpo pode estar deslocado para cima ou para baixo das marcas.
 *
 * Metade da tolerância de tamanho, e de propósito: deslocamento se enxerga mais
 * que diferença de altura. Cabeça fora do retângulo é óbvio na tela; o corpo
 * ocupar 3% a menos, não.
 */
const TOLERANCIA_CENTRO = 0.06;

/**
 * Quão fora do centro o corpo pode estar antes de virar instrução.
 *
 * O corpo é uma coluna estreita no quadro: sair um pouco do meio não estraga a
 * medida, sair muito corta braço.
 */
const DESVIO_LATERAL = 0.15;

/**
 * Razão entre o alvo e o ocupado a partir da qual um passo vira vários.
 *
 * Só existe para o lado de longe, e a assimetria é da física, não do desenho:
 * longe é ilimitado, perto é limitado pelo quadro. O corpo não ocupa mais que a
 * tela inteira, então a razão nunca desce de `ALTURA_ALVO` — não sobra faixa
 * para dois níveis de "afaste-se". E o caso extremo de perto já tem frase
 * melhor: cabeça ou pés cortados, que o aluno confere olhando para si.
 */
const MUITO_LONGE = 1.5;

/**
 * Fração da máscara a partir da qual existe alguém no quadro.
 *
 * Medido em aparelho: sem ninguém dá 0; com uma pessoa em pé, de 0.07 (longe) a
 * 0.68 (perto demais). Qualquer valor bem acima de zero já é corpo.
 */
const COBERTURA_COM_ALGUEM = 0.02;

/**
 * Quanto as tolerâncias afrouxam depois que o portão abre.
 *
 * Mais difícil abrir do que continuar aberto. Sem isso, a oscilação natural de
 * quem está em pé — medida em aparelho: a coroa variou de 0.014 para 0.009
 * entre dois quadros — fecha o portão, mata a contagem e faz o aviso "fique
 * parado" repetir. A pessoa parada perderia a foto por estar parada.
 */
const FOLGA_DEPOIS_DE_ABRIR = 1.5;

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

/** Problemas que exigem uma mudança grande: ainda não é questão de ajustar. */
const LONGE: ReadonlySet<IdDaInstrucao> = new Set(['sem-corpo', 'vista-errada', 'aproxime-muito']);

/**
 * Quanto tempo a mesma instrução fica calada antes de ser dita de novo.
 *
 * A anti-repetição sozinha criava um silêncio ambíguo: calar significa "está
 * certo", mas quem ficava preso no mesmo problema também ouvia silêncio. Os
 * dois estados eram indistinguíveis, e o aluno esperava por uma foto que nunca
 * vinha.
 */
const REPETIR_APOS_MS = 8000;

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
  /** Há quanto tempo a voz falou. Passado o limite, repete mesmo sem mudar. */
  msDesdeAFala?: number;
}

export interface Portao {
  liberado: boolean;
  proximidade: Proximidade;
  /** A instrução de maior prioridade, ou `null` quando está tudo certo. */
  instrucao: Instrucao | null;
  /** Falso quando a instrução é a mesma da última falada — silêncio é informação. */
  deveFalar: boolean;
  avisos: AvisoDeQualidade[];
}

/**
 * Toda frase manda fazer UMA coisa, com direção e tamanho.
 *
 * "Centralize ou afaste-se" descrevia o problema e oferecia duas saídas
 * contraditórias — para quem está a três metros da tela, sem conseguir lê-la,
 * isso é o mesmo que silêncio.
 */
const TEXTOS: Record<IdDaInstrucao, string> = {
  'sem-corpo': 'Não estou te vendo. Fique de frente para a câmera.',
  'cabeca-cortada': 'Sua cabeça está cortada. Afaste-se um passo da câmera.',
  'pes-cortados': 'Seus pés estão cortados. Afaste-se um passo da câmera.',
  'va-para-esquerda': 'Dê um passo para a sua esquerda.',
  'va-para-direita': 'Dê um passo para a sua direita.',
  'passo-a-frente': 'Dê um passo à frente.',
  'passo-atras': 'Dê um passo para trás.',
  'vista-errada': 'Vire para a posição pedida.',
  aproxime: 'Aproxime-se um passo da câmera.',
  'aproxime-muito': 'Você está longe. Aproxime-se dois passos da câmera.',
  afaste: 'Afaste-se um passo da câmera.',
  'suba-o-celular': 'Você está acima do quadro. Levante um pouco o celular.',
  'baixe-o-celular': 'Você está abaixo do quadro. Abaixe um pouco o celular.',
  nivel: 'Endireite o aparelho.',
};

const nomeiaVista = (vista: Vista): string =>
  ({ front: 'de frente', back: 'de costas', side: 'de lado' })[vista];

/**
 * Ninguém na imagem — não "alguém mal enquadrado".
 *
 * A visibilidade sozinha confundia os dois: perto demais, com pés e cabeça fora
 * do quadro, ela despenca e o portão dizia "não estou te vendo" para quem
 * estava ocupando dois terços da tela. A cobertura separa os casos — havendo
 * corpo na máscara, a cascata segue para as instruções que dizem o que corrigir.
 */
function semCorpo(fatos: FatosDaCaptura): boolean {
  if (fatos.coroaY === null || fatos.chaoY === null) return true;
  if (fatos.cobertura >= COBERTURA_COM_ALGUEM) return false;

  const limiar =
    fatos.vistaPedida === 'side' ? VISIBILIDADE_MINIMA.lateral : VISIBILIDADE_MINIMA.frontal;

  return fatos.visibilidadeMinima < limiar;
}

/**
 * A pose bate com a pedida — dentro do que dá para saber.
 *
 * Trava as três vistas, inclusive frente contra costas.
 *
 * Isso só é honesto porque a detecção passou a sair da **ordem dos ombros** —
 * de frente, o ombro esquerdo do aluno aparece à direita da imagem; de costas,
 * à esquerda. Enquanto ela dependia da visibilidade do rosto, travar aqui
 * prendia quem estava de costas numa instrução impossível, e o portão precisou
 * afrouxar. Com sinal geométrico no lugar do palpite, a trava volta.
 */
function vistaErrada(fatos: FatosDaCaptura): boolean {
  if (fatos.vistaDetectada === null) return false;

  return fatos.vistaDetectada !== fatos.vistaPedida;
}

/**
 * Para onde o aluno anda, ou `null` quando já está centrado.
 *
 * **A mesma correção tem três nomes, porque depende de para onde ele olha.**
 * Deslocar-se para a direita da imagem é, de frente, andar para a própria
 * esquerda; de costas, para a própria direita; e de perfil não é lado nenhum —
 * é dar um passo à frente ou para trás, porque de lado o eixo horizontal do
 * quadro é o eixo frente-costas do corpo.
 *
 * Uma frase só para os três casos acerta em um e manda o aluno para o lugar
 * errado nos outros dois.
 */
function ladoParaAndar(fatos: FatosDaCaptura, folga: number): IdDaInstrucao | null {
  if (fatos.centroX === null) return null;

  const desvio = fatos.centroX - 0.5;
  if (Math.abs(desvio) <= DESVIO_LATERAL * folga) return null;

  const paraDireitaDaImagem = desvio < 0;

  if (fatos.vistaPedida === 'side') {
    if (fatos.viradoParaDireita === null) return null;

    return paraDireitaDaImagem === fatos.viradoParaDireita ? 'passo-a-frente' : 'passo-atras';
  }

  const paraAPropriaEsquerda =
    fatos.vistaPedida === 'front' ? paraDireitaDaImagem : !paraDireitaDaImagem;

  return paraAPropriaEsquerda ? 'va-para-esquerda' : 'va-para-direita';
}

/** Quanto da altura do frame o corpo ocupa, ou `null` sem silhueta. */
function alturaOcupada(fatos: FatosDaCaptura): number | null {
  if (fatos.coroaY === null || fatos.chaoY === null) return null;

  return fatos.chaoY - fatos.coroaY;
}

/**
 * A distância, com direção e tamanho.
 *
 * A fração que o corpo ocupa é inversa à distância, então a razão entre alvo e
 * ocupado diz não só para que lado andar, mas quanto.
 */
function distancia(fatos: FatosDaCaptura, folga: number): IdDaInstrucao | null {
  const ocupada = alturaOcupada(fatos);
  if (ocupada === null || ocupada <= 0) return null;

  const razao = ALTURA_ALVO / ocupada;
  const margem = (TOLERANCIA_ALTURA * folga) / ALTURA_ALVO;

  if (razao >= MUITO_LONGE) return 'aproxime-muito';
  if (razao > 1 + margem) return 'aproxime';
  if (razao < 1 - margem) return 'afaste';

  return null;
}

/**
 * O corpo está dentro das marcas, e não só do tamanho certo.
 *
 * O deslocamento vertical não se corrige andando — depende de para onde o
 * aparelho aponta —, então a instrução fala do celular, não do aluno.
 */
function alinhamentoVertical(fatos: FatosDaCaptura, folga: number): IdDaInstrucao | null {
  if (fatos.coroaY === null || fatos.chaoY === null) return null;

  const limite = TOLERANCIA_CENTRO * folga;
  const centroDoCorpo = (fatos.coroaY + fatos.chaoY) / 2;
  const centroDasMarcas = (MARCA_TOPO + MARCA_BASE) / 2;
  const desvio = centroDoCorpo - centroDasMarcas;

  if (Math.abs(desvio) <= limite) return null;

  return desvio < 0 ? 'suba-o-celular' : 'baixe-o-celular';
}

function foraDeNivel(fatos: FatosDaCaptura): boolean {
  if (!fatos.nivelDisponivel) return false;

  return Math.abs(fatos.pitch) > INCLINACAO_MAXIMA || Math.abs(fatos.roll) > INCLINACAO_MAXIMA;
}

/**
 * A primeira falha da cascata, ou `null` quando a geometria está inteira.
 *
 * A ordem vai da checagem que invalida a foto para a que apenas degrada, e cada
 * degrau devolve uma ação única: some primeiro o que impede de medir, depois o
 * que desloca a medida, por último o que só a piora.
 */
function primeiraFalha(fatos: FatosDaCaptura, estavaLiberado: boolean): IdDaInstrucao | null {
  if (semCorpo(fatos)) return 'sem-corpo';
  if (vistaErrada(fatos)) return 'vista-errada';

  const folga = estavaLiberado ? FOLGA_DEPOIS_DE_ABRIR : 1;

  // Borda cortada vem antes da distância porque a causa é a mesma — estar perto
  // demais — mas a frase é mais concreta: o aluno sabe olhar para os próprios pés.
  if (fatos.coroaY !== null && fatos.coroaY <= 0.01 / folga) return 'cabeca-cortada';
  if (fatos.chaoY !== null && fatos.chaoY >= 1 - 0.01 / folga) return 'pes-cortados';

  const lado = ladoParaAndar(fatos, folga);
  if (lado !== null) return lado;

  const passo = distancia(fatos, folga);
  if (passo !== null) return passo;

  // Tamanho certo não é lugar certo. Sem esta checagem, quem tivesse a altura
  // correta mas estivesse deslocado para cima passava com a cabeça fora do
  // retângulo desenhado — e um retângulo que não precisa ser respeitado é um
  // retângulo que mente.
  const desalinhado = alinhamentoVertical(fatos, folga);
  if (desalinhado !== null) return desalinhado;

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
 * @example
 * const { liberado, instrucao, deveFalar } = avaliarPortao(fatos, contexto);
 * if (deveFalar && instrucao) voz.speak(instrucao.texto);
 */
export function avaliarPortao(fatos: FatosDaCaptura, contexto: ContextoDoPortao = {}): Portao {
  const { ultimaFalada = null, estavaLiberado = false, msDesdeAFala = 0 } = contexto;
  const falha = primeiraFalha(fatos, estavaLiberado);
  const avisos = avisosDeQualidade(fatos);

  if (falha === null) {
    return { liberado: true, proximidade: 'pronto', instrucao: null, deveFalar: false, avisos };
  }

  return {
    liberado: false,
    proximidade: LONGE.has(falha) ? 'longe' : 'quase',
    instrucao: montarInstrucao(falha, fatos),
    deveFalar: falha !== ultimaFalada || msDesdeAFala >= REPETIR_APOS_MS,
    avisos,
  };
}
