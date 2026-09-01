import type { LandmarkNormalizado } from "../fatos";

/**
 * Um corpo de perfil numa profundidade escolhida.
 *
 * Não é `.test.ts` de propósito: é ferramenta das suítes, não suíte.
 *
 * Com a coxa de comprimento fixo, a profundidade — `dy / |coxa|` — sai da
 * posição do quadril em relação ao joelho. Isso deixa os testes falarem na
 * unidade do julgador (−1 em pé, 0 na paralela) em vez de em coordenadas que
 * ninguém confere de cabeça.
 */

const OMBRO_ESQ = 11;
const OMBRO_DIR = 12;
const QUADRIL_ESQ = 23;
const QUADRIL_DIR = 24;
const JOELHO_ESQ = 25;
const JOELHO_DIR = 26;
const TORNOZELO_ESQ = 27;
const TORNOZELO_DIR = 28;

/** Comprimento da coxa em fração do quadro. Mantém todos os pontos dentro dele. */
const COXA = 0.2;

const JOELHO = { x: 0.5, y: 0.7 };

export function corpoNaProfundidade(p: number): LandmarkNormalizado[] {
  const pontos: LandmarkNormalizado[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.9,
  }));

  const quadril = {
    x: JOELHO.x + Math.sqrt(Math.max(0, 1 - p * p)) * COXA,
    y: JOELHO.y + p * COXA,
  };

  // Ombros quase sobrepostos: é o que a razão ombro/tronco lê como perfil.
  pontos[OMBRO_ESQ] = { x: quadril.x, y: quadril.y - 0.25, visibility: 0.9 };
  pontos[OMBRO_DIR] = { x: quadril.x + 0.02, y: quadril.y - 0.25, visibility: 0.3 };
  pontos[QUADRIL_ESQ] = { ...quadril, visibility: 0.9 };
  pontos[QUADRIL_DIR] = { x: quadril.x + 0.02, y: quadril.y, visibility: 0.3 };
  pontos[JOELHO_ESQ] = { ...JOELHO, visibility: 0.9 };
  pontos[JOELHO_DIR] = { x: JOELHO.x + 0.02, y: JOELHO.y, visibility: 0.3 };
  pontos[TORNOZELO_ESQ] = { x: JOELHO.x, y: 0.95, visibility: 0.9 };
  pontos[TORNOZELO_DIR] = { x: JOELHO.x + 0.02, y: 0.95, visibility: 0.3 };

  return pontos;
}

/** Em pé, desce até `fundo`, volta a estender. Quadros densos como no aparelho. */
export const umaRepeticaoAte = (fundo: number): LandmarkNormalizado[][] =>
  [-1, -0.6, -0.3, fundo, fundo - 0.2, -0.5, -0.8, -0.95].map(corpoNaProfundidade);
