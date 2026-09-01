import type { FatosDoMovimento, Ponto } from "./agachamento";

/**
 * Traduz os 33 landmarks do BlazePose nos fatos que o julgador consome.
 *
 * Vive em `shared/` pela mesma razão que o julgador: o web extrai landmarks com
 * o WASM do MediaPipe e o aparelho com o AAR do Android, mas **qual lado do
 * corpo ler, o que conta como estar de perfil e o que conta como estar fora do
 * quadro precisam ser a mesma decisão nos dois**. Duplicar isso faria o limiar
 * calibrado no painel valer para fatos que o celular não produz.
 */

/** Índices do BlazePose. Os 33 estão documentados pela Google. */
const OMBRO_ESQ = 11;
const OMBRO_DIR = 12;
const QUADRIL_ESQ = 23;
const QUADRIL_DIR = 24;
const JOELHO_ESQ = 25;
const JOELHO_DIR = 26;
const TORNOZELO_ESQ = 27;
const TORNOZELO_DIR = 28;

const TOTAL_DE_LANDMARKS = 33;

/**
 * Razão ombro-a-ombro sobre tronco abaixo da qual o corpo está de perfil.
 *
 * De frente, a distância entre os ombros é a largura real; de lado, ela colapsa
 * na projeção. Mesmo limiar que o `Fatos.kt` do body scan usa — e, como lá,
 * **ponto de partida e não número medido**: o `ADR-0022` é o lembrete de que os
 * primeiros chutes de limiar barravam captura boa até serem medidos.
 */
const RAZAO_PERFIL = 0.45;

/** O que cada plataforma entrega. `visibility` é opcional: nem toda fonte tem. */
export interface LandmarkNormalizado {
  x: number;
  y: number;
  visibility?: number;
}

/**
 * O ponto, ou `null` se ele caiu fora do quadro.
 *
 * O MediaPipe devolve os 33 pontos sempre, inclusive extrapolando para fora da
 * imagem quando o membro não aparece. Aceitar essa extrapolação como medida é
 * julgar um joelho que a câmera não viu — e a coordenada de fora do quadro é
 * chute do modelo, não observação.
 */
function pontoNoQuadro(landmark: LandmarkNormalizado | undefined): Ponto | null {
  if (landmark === undefined) return null;
  if (landmark.x < 0 || landmark.x > 1) return null;
  if (landmark.y < 0 || landmark.y > 1) return null;

  return { x: landmark.x, y: landmark.y };
}

function visibilidade(landmark: LandmarkNormalizado | undefined): number {
  // Fonte sem `visibility` não é fonte sem corpo: tratar ausência como zero
  // reprovaria todo quadro de uma plataforma que simplesmente não reporta.
  return landmark?.visibility ?? 1;
}

function distancia(a: Ponto, b: Ponto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function meio(a: Ponto, b: Ponto): Ponto {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * A pessoa está de perfil? `null` quando não dá para decidir.
 *
 * `null` importa tanto quanto os outros dois: o julgador trata "não sei" como
 * "não reprovo", então devolver `false` por falta de informação prenderia
 * alguém bem posicionado numa instrução impossível de satisfazer.
 */
function estaDePerfil(pontos: LandmarkNormalizado[]): boolean | null {
  const ombroE = pontoNoQuadro(pontos[OMBRO_ESQ]);
  const ombroD = pontoNoQuadro(pontos[OMBRO_DIR]);
  const quadrilE = pontoNoQuadro(pontos[QUADRIL_ESQ]);
  const quadrilD = pontoNoQuadro(pontos[QUADRIL_DIR]);

  if (ombroE === null || ombroD === null || quadrilE === null || quadrilD === null) {
    return null;
  }

  const tronco = distancia(meio(ombroE, ombroD), meio(quadrilE, quadrilD));
  if (tronco === 0) return null;

  return distancia(ombroE, ombroD) / tronco < RAZAO_PERFIL;
}

/**
 * O lado do corpo que a câmera está vendo melhor.
 *
 * De perfil, metade do corpo se auto-oclui e o MediaPipe rebaixa a visibilidade
 * do lado escondido. Ler um lado fixo daria, em metade das gravações, a perna
 * que está atrás — com coordenada inferida em vez de observada.
 */
function ladoVisivel(pontos: LandmarkNormalizado[]): {
  quadril: number;
  joelho: number;
  tornozelo: number;
} {
  const esquerdo =
    visibilidade(pontos[QUADRIL_ESQ]) +
    visibilidade(pontos[JOELHO_ESQ]) +
    visibilidade(pontos[TORNOZELO_ESQ]);

  const direito =
    visibilidade(pontos[QUADRIL_DIR]) +
    visibilidade(pontos[JOELHO_DIR]) +
    visibilidade(pontos[TORNOZELO_DIR]);

  return esquerdo >= direito
    ? { quadril: QUADRIL_ESQ, joelho: JOELHO_ESQ, tornozelo: TORNOZELO_ESQ }
    : { quadril: QUADRIL_DIR, joelho: JOELHO_DIR, tornozelo: TORNOZELO_DIR };
}

/** Nada no quadro. Fatos que o julgador lê como "não dá para julgar". */
const SEM_CORPO: FatosDoMovimento = {
  quadril: null,
  joelho: null,
  tornozelo: null,
  dePerfil: null,
  visibilidadeMinima: 0,
};

/**
 * Monta os fatos de um quadro.
 *
 * @example
 * const fatos = fatosDeLandmarks(resultado.landmarks[0]);
 * movimento = avaliarAgachamento(fatos, movimento);
 */
export function fatosDeLandmarks(pontos: LandmarkNormalizado[]): FatosDoMovimento {
  if (pontos.length !== TOTAL_DE_LANDMARKS) return SEM_CORPO;

  const lado = ladoVisivel(pontos);

  return {
    quadril: pontoNoQuadro(pontos[lado.quadril]),
    joelho: pontoNoQuadro(pontos[lado.joelho]),
    tornozelo: pontoNoQuadro(pontos[lado.tornozelo]),
    dePerfil: estaDePerfil(pontos),
    // O mínimo entre as TRÊS que importam, não entre os 33: uma orelha ocluída
    // zeraria a medida e reprovaria um agachamento perfeitamente legível.
    visibilidadeMinima: Math.min(
      visibilidade(pontos[lado.quadril]),
      visibilidade(pontos[lado.joelho]),
      visibilidade(pontos[lado.tornozelo]),
    ),
  };
}
