/**
 * O julgador do agachamento.
 *
 * Recebe o que a visão mediu num quadro e devolve em que ponto do movimento a
 * pessoa está, quantas repetições já fez, e o veredito da que acabou de fechar.
 * Puro de propósito, e em `shared/` de propósito: o mesmo código julga no
 * aparelho e varre limiares no painel de calibração. Duas implementações da
 * mesma regra divergem em silêncio, e aí o limiar calibrado contra uma passa a
 * valer para a outra sem nunca ter sido testado nela.
 */

export interface Ponto {
  x: number;
  y: number;
}

/**
 * O que a visão mediu num quadro. Só o que o julgador precisa.
 *
 * Coordenadas normalizadas do quadro, com **Y crescendo para baixo** — é a
 * convenção do MediaPipe, e inverter aqui só criaria um lugar a mais para errar
 * o sinal.
 */
export interface FatosDoMovimento {
  quadril: Ponto | null;
  joelho: Ponto | null;
  tornozelo: Ponto | null;
  /** A pessoa está de perfil? `null` quando não dá para decidir. */
  dePerfil: boolean | null;
  /** Menor visibilidade entre quadril, joelho e tornozelo. */
  visibilidadeMinima: number;
}

export type Fase = "em-pe" | "descendo" | "no-fundo" | "subindo";

export type IdDoVeredito = "fundo" | "faltou";
export type IdDoAviso = "fique-de-lado" | "corpo-fora-do-quadro";

export interface Veredito {
  id: IdDoVeredito;
  texto: string;
}

export interface Aviso {
  id: IdDoAviso;
  texto: string;
}

/**
 * Os números que a calibração ajusta.
 *
 * São parâmetro, e não constante, por uma razão concreta e não por
 * flexibilidade: a varredura do painel roda **este mesmo julgador** dezenas de
 * vezes trocando `fundo`, e é assim que o limiar sai de medida em vez de
 * palpite. Se a varredura simulasse a regra em vez de executá-la, o número
 * escolhido responderia pela simulação.
 */
export interface Limiares {
  /**
   * Profundidade a partir da qual a repetição conta como funda.
   *
   * O padrão é **zero**, e não é arbitrário: a métrica é o delta vertical
   * quadril–joelho dividido pelo comprimento da coxa, então vale −1 em pé, 0 na
   * paralela e positivo abaixo dela. "Quadril abaixo da linha do joelho" é
   * literalmente `> 0` — o critério do personal já é a definição.
   */
  fundo: number;
  /**
   * Profundidade que marca o fim da posição em pé.
   *
   * Longe de zero de propósito: quem está parado oscila, e um limite colado no
   * ponto de repouso faria a máquina entrar em "descendo" a cada respiração.
   */
  inicioDaDescida: number;
  /**
   * Profundidade para a repetição fechar e a pessoa voltar a "em pé".
   *
   * Mais exigente que `inicioDaDescida`, e essa assimetria **é** a histerese: a
   * faixa morta entre os dois impede o contador de piscar quando a pessoa não
   * estende por completo entre repetições. Sem ela, uma oscilação em torno de
   * um limiar único conta cinco repetições onde houve uma — o mesmo problema
   * que o `FOLGA_DEPOIS_DE_ABRIR` resolve no `portao.ts`.
   */
  voltaAEmPe: number;
  /**
   * Quanto a pessoa precisa subir, a partir do ponto mais fundo, para a máquina
   * aceitar que ela está subindo.
   *
   * Existe para a pausa no fundo. Sem esta folga, o tremor de quem está parado
   * embaixo alterna "no fundo" e "subindo" a cada quadro, e a repetição
   * fecharia no meio da pausa.
   */
  folgaDeSubida: number;
  /**
   * Visibilidade mínima das três articulações que importam.
   *
   * Ponto de partida, não número medido — o `ADR-0022` é o lembrete de que os
   * primeiros chutes de visibilidade (0.6 e 0.35) barravam captura boa até
   * serem medidos em aparelho. Este vai pelo mesmo caminho.
   */
  visibilidadeMinima: number;
}

export const LIMIARES_PADRAO: Limiares = {
  fundo: 0,
  inicioDaDescida: -0.5,
  voltaAEmPe: -0.75,
  folgaDeSubida: 0.12,
  visibilidadeMinima: 0.3,
};

const TEXTO_DO_VEREDITO: Record<IdDoVeredito, string> = {
  fundo: "Fundo.",
  faltou: "Faltou.",
};

/**
 * O que a voz diz.
 *
 * Vocabulário restrito ao movimento. O aparelho fala em voz alta numa academia,
 * e o que sai dele é ouvido por quem está ao redor — frase sobre o movimento é
 * instrução, frase sobre a pessoa é divulgação de dado de saúde a terceiros
 * (Art. 6°, VII).
 */
const TEXTO_DO_AVISO: Record<IdDoAviso, string> = {
  "fique-de-lado": "Fique de lado para a câmera.",
  "corpo-fora-do-quadro": "Preciso ver seu quadril, seu joelho e seu tornozelo.",
};

/** O que o julgador precisa lembrar entre um quadro e o próximo. */
export interface ContextoDoMovimento {
  fase?: Fase;
  repeticoes?: number;
  /** Ponto mais fundo da repetição em curso. É dele que sai o veredito. */
  maiorProfundidade?: number;
  /** Último aviso falado. Por ele o julgador cala a repetição. */
  ultimoAvisado?: IdDoAviso | null;
}

export interface Movimento {
  fase: Fase;
  repeticoes: number;
  maiorProfundidade: number;
  ultimoAvisado: IdDoAviso | null;
  /** Profundidade agora; `null` quando o quadro não permite medir. */
  profundidade: number | null;
  /** Preenchido **só** no quadro em que a repetição fecha. */
  veredito: Veredito | null;
  aviso: Aviso | null;
  /** Falso quando o aviso é o mesmo já falado — silêncio é informação. */
  deveFalar: boolean;
}

/**
 * Quanto o quadril está abaixo do joelho, em comprimentos de coxa.
 *
 * A normalização pela coxa é o que torna a medida **invariante à escala**: a
 * coxa é um segmento rígido, então a razão não muda se a pessoa estiver a dois
 * ou a quatro metros da câmera. É por isso que esta tela não precisa de portão
 * de distância, diferente do body scan — lá a escala era o produto, aqui ela se
 * cancela.
 *
 * Vale −1 em pé, 0 na paralela, positivo abaixo dela.
 */
function medirProfundidade(quadril: Ponto, joelho: Ponto): number | null {
  const dx = quadril.x - joelho.x;
  const dy = quadril.y - joelho.y;
  const coxa = Math.hypot(dx, dy);

  // Coxa de comprimento zero é landmark degenerado, não pessoa agachada.
  if (coxa === 0) return null;

  return dy / coxa;
}

/**
 * O quadro permite julgar, ou o que impede.
 *
 * De frente, o mesmo cálculo devolve número plausível e errado — a coxa some na
 * projeção e a razão deixa de significar profundidade. Julgar assim mesmo é o
 * pecado que o `ADR-0022` já corrigiu uma vez: número com aparência de legítimo
 * saindo de premissa que ninguém verificou.
 */
function impedimento(fatos: FatosDoMovimento, limiares: Limiares): IdDoAviso | null {
  if (fatos.quadril === null || fatos.joelho === null || fatos.tornozelo === null) {
    return "corpo-fora-do-quadro";
  }

  if (fatos.visibilidadeMinima < limiares.visibilidadeMinima) return "corpo-fora-do-quadro";

  // `null` é "não sei", e não sei não reprova — mesma política do `portao.ts`.
  if (fatos.dePerfil === false) return "fique-de-lado";

  return null;
}

/** A máquina não anda, mas o que já foi contado não se perde. */
function congelar(contexto: Required<ContextoDoMovimento>, aviso: IdDoAviso): Movimento {
  return {
    fase: contexto.fase,
    repeticoes: contexto.repeticoes,
    maiorProfundidade: contexto.maiorProfundidade,
    ultimoAvisado: aviso,
    profundidade: null,
    veredito: null,
    aviso: { id: aviso, texto: TEXTO_DO_AVISO[aviso] },
    deveFalar: aviso !== contexto.ultimoAvisado,
  };
}

/** Para onde a máquina vai, dada a fase atual e a profundidade agora. */
function proximaFase(fase: Fase, profundidade: number, maior: number, limiares: Limiares): Fase {
  if (fase === "em-pe") {
    return profundidade > limiares.inicioDaDescida ? "descendo" : "em-pe";
  }

  if (fase === "descendo") {
    if (profundidade >= limiares.fundo) return "no-fundo";

    return profundidade < maior - limiares.folgaDeSubida ? "subindo" : "descendo";
  }

  if (fase === "no-fundo") {
    return profundidade < maior - limiares.folgaDeSubida ? "subindo" : "no-fundo";
  }

  return profundidade < limiares.voltaAEmPe ? "em-pe" : "subindo";
}

/**
 * Julga um quadro do movimento.
 *
 * O resultado serve de contexto para o próximo quadro — devolva-o inteiro, sem
 * remontar estado na mão.
 *
 * @example
 * let movimento = avaliarAgachamento(fatos, {});
 * // no quadro seguinte:
 * movimento = avaliarAgachamento(novosFatos, movimento);
 * if (movimento.veredito) voz.speak(movimento.veredito.texto);
 */
export function avaliarAgachamento(
  fatos: FatosDoMovimento,
  contexto: ContextoDoMovimento = {},
  limiares: Limiares = LIMIARES_PADRAO,
): Movimento {
  const estado: Required<ContextoDoMovimento> = {
    fase: contexto.fase ?? "em-pe",
    repeticoes: contexto.repeticoes ?? 0,
    maiorProfundidade: contexto.maiorProfundidade ?? Number.NEGATIVE_INFINITY,
    ultimoAvisado: contexto.ultimoAvisado ?? null,
  };

  const barreira = impedimento(fatos, limiares);
  if (barreira !== null) return congelar(estado, barreira);

  // `impedimento` já garantiu que os três pontos existem.
  const quadril = fatos.quadril as Ponto;
  const joelho = fatos.joelho as Ponto;

  const profundidade = medirProfundidade(quadril, joelho);
  if (profundidade === null) return congelar(estado, "corpo-fora-do-quadro");

  // A repetição começa a contar profundidade quando a descida começa: manter o
  // valor de repouso como "maior" faria a primeira comparação da descida
  // seguinte disputar com o fundo da anterior.
  const maior =
    estado.fase === "em-pe" ? profundidade : Math.max(estado.maiorProfundidade, profundidade);

  const fase = proximaFase(estado.fase, profundidade, maior, limiares);
  const fechou = estado.fase === "subindo" && fase === "em-pe";

  // O veredito sai do ponto MAIS FUNDO da repetição, não da profundidade no
  // instante em que ela fecha — que é sempre a de quem já voltou a ficar em pé.
  const id: IdDoVeredito = maior >= limiares.fundo ? "fundo" : "faltou";

  return {
    fase,
    repeticoes: fechou ? estado.repeticoes + 1 : estado.repeticoes,
    maiorProfundidade: fechou ? Number.NEGATIVE_INFINITY : maior,
    // Quadro bom limpa a memória do aviso: o mesmo problema, se voltar daqui a
    // um minuto, é notícia de novo.
    ultimoAvisado: null,
    profundidade,
    veredito: fechou ? { id, texto: TEXTO_DO_VEREDITO[id] } : null,
    aviso: null,
    deveFalar: fechou,
  };
}
