import { describe, expect, it } from "vitest";
import { fatosDeLandmarks, type LandmarkNormalizado } from "../fatos";

const OMBRO_ESQ = 11;
const OMBRO_DIR = 12;
const QUADRIL_ESQ = 23;
const QUADRIL_DIR = 24;
const JOELHO_ESQ = 25;
const JOELHO_DIR = 26;
const TORNOZELO_ESQ = 27;
const TORNOZELO_DIR = 28;

/**
 * Um corpo de perfil, em pé, com o lado esquerdo à frente.
 *
 * Ombros praticamente sobrepostos — é isso que a razão ombro/tronco enxerga
 * como perfil. O lado direito recebe visibilidade baixa porque está atrás.
 */
function corpoDePerfil(
  ajustes: Record<number, Partial<LandmarkNormalizado>> = {},
): LandmarkNormalizado[] {
  const pontos: LandmarkNormalizado[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.9,
  }));

  pontos[OMBRO_ESQ] = { x: 0.5, y: 0.2, visibility: 0.9 };
  pontos[OMBRO_DIR] = { x: 0.52, y: 0.2, visibility: 0.3 };
  pontos[QUADRIL_ESQ] = { x: 0.5, y: 0.5, visibility: 0.9 };
  pontos[QUADRIL_DIR] = { x: 0.52, y: 0.5, visibility: 0.3 };
  pontos[JOELHO_ESQ] = { x: 0.5, y: 0.7, visibility: 0.9 };
  pontos[JOELHO_DIR] = { x: 0.52, y: 0.7, visibility: 0.3 };
  pontos[TORNOZELO_ESQ] = { x: 0.5, y: 0.9, visibility: 0.9 };
  pontos[TORNOZELO_DIR] = { x: 0.52, y: 0.9, visibility: 0.3 };

  for (const [indice, ajuste] of Object.entries(ajustes)) {
    pontos[Number(indice)] = { ...pontos[Number(indice)], ...ajuste };
  }

  return pontos;
}

/** Mesmo corpo, de frente: ombros largos em relação ao tronco. */
function corpoDeFrente(): LandmarkNormalizado[] {
  const pontos = corpoDePerfil();

  pontos[OMBRO_ESQ] = { x: 0.4, y: 0.2, visibility: 0.9 };
  pontos[OMBRO_DIR] = { x: 0.6, y: 0.2, visibility: 0.9 };

  return pontos;
}

describe("fatosDeLandmarks", () => {
  it("lê o lado do corpo que a câmera está vendo melhor", () => {
    // De perfil, metade do corpo se auto-oclui. Ler um lado fixo entregaria, em
    // metade das gravações, a perna de trás — coordenada inferida, não vista.
    const fatos = fatosDeLandmarks(corpoDePerfil());

    expect(fatos.joelho).toEqual({ x: 0.5, y: 0.7 });
  });

  it("troca de lado quando o outro passa a estar mais visível", () => {
    const fatos = fatosDeLandmarks(
      corpoDePerfil({
        [QUADRIL_ESQ]: { visibility: 0.1 },
        [JOELHO_ESQ]: { visibility: 0.1 },
        [TORNOZELO_ESQ]: { visibility: 0.1 },
        [QUADRIL_DIR]: { visibility: 0.95 },
        [JOELHO_DIR]: { visibility: 0.95 },
        [TORNOZELO_DIR]: { visibility: 0.95 },
      }),
    );

    expect(fatos.joelho).toEqual({ x: 0.52, y: 0.7 });
  });

  it("reconhece o corpo de perfil", () => {
    expect(fatosDeLandmarks(corpoDePerfil()).dePerfil).toBe(true);
  });

  it("reconhece o corpo de frente", () => {
    expect(fatosDeLandmarks(corpoDeFrente()).dePerfil).toBe(false);
  });

  it("não decide o perfil quando falta o tronco no quadro", () => {
    // "Não sei" precisa chegar ao julgador como `null`: `false` por falta de
    // informação prenderia alguém bem posicionado numa instrução impossível.
    const fatos = fatosDeLandmarks(corpoDePerfil({ [OMBRO_ESQ]: { y: -0.2 } }));

    expect(fatos.dePerfil).toBeNull();
  });

  it("descarta articulação que o modelo extrapolou para fora do quadro", () => {
    // O MediaPipe devolve os 33 pontos sempre, inclusive fora da imagem quando
    // o membro não aparece. Isso é chute do modelo, não observação.
    const fatos = fatosDeLandmarks(corpoDePerfil({ [TORNOZELO_ESQ]: { y: 1.4 } }));

    expect(fatos.tornozelo).toBeNull();
  });

  it("reporta a menor visibilidade entre as três articulações que importam", () => {
    // O mínimo entre os 33 zeraria com uma orelha ocluída, reprovando um
    // agachamento perfeitamente legível.
    const fatos = fatosDeLandmarks(corpoDePerfil({ [JOELHO_ESQ]: { visibility: 0.4 } }));

    expect(fatos.visibilidadeMinima).toBeCloseTo(0.4, 10);
  });

  it("ignora a visibilidade de landmarks que não são do movimento", () => {
    const fatos = fatosDeLandmarks(corpoDePerfil({ 7: { visibility: 0 } }));

    expect(fatos.visibilidadeMinima).toBeCloseTo(0.9, 10);
  });

  it("devolve fatos sem corpo quando não vêm os 33 landmarks", () => {
    const fatos = fatosDeLandmarks([]);

    expect(fatos.quadril).toBeNull();
    expect(fatos.dePerfil).toBeNull();
    expect(fatos.visibilidadeMinima).toBe(0);
  });

  it("aceita fonte que não reporta visibilidade", () => {
    // Ausência de `visibility` não é ausência de corpo: tratá-la como zero
    // reprovaria todo quadro de uma plataforma que simplesmente não reporta.
    const pontos = corpoDePerfil().map(({ x, y }) => ({ x, y }));
    const fatos = fatosDeLandmarks(pontos);

    expect(fatos.visibilidadeMinima).toBe(1);
    expect(fatos.joelho).not.toBeNull();
  });
});
