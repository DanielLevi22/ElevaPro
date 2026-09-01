import { describe, expect, it } from "vitest";
import { diagnosticar, motivoDominante } from "../diagnostico";
import type { LandmarkNormalizado } from "../fatos";
import { corpoNaProfundidade, umaRepeticaoAte } from "./corpo";

const OMBRO_ESQ = 11;
const OMBRO_DIR = 12;
const TORNOZELO_ESQ = 27;

/** O mesmo corpo, mas de frente: ombros largos em relação ao tronco. */
function deFrente(p: number): LandmarkNormalizado[] {
  const pontos = corpoNaProfundidade(p);
  const x = pontos[OMBRO_ESQ].x;

  pontos[OMBRO_ESQ] = { x: x - 0.12, y: pontos[OMBRO_ESQ].y, visibility: 0.9 };
  pontos[OMBRO_DIR] = { x: x + 0.12, y: pontos[OMBRO_DIR].y, visibility: 0.9 };

  return pontos;
}

/** O mesmo corpo, com os pés fora do quadro. */
function semPe(p: number): LandmarkNormalizado[] {
  const pontos = corpoNaProfundidade(p);
  pontos[TORNOZELO_ESQ] = { x: 0.5, y: 1.4, visibility: 0.9 };

  return pontos;
}

describe("diagnosticar", () => {
  it("conta como aptos os quadros que o julgador consegue ler", () => {
    const d = diagnosticar(umaRepeticaoAte(0.2));

    expect(d.quadros).toBe(8);
    expect(d.aptos).toBe(8);
    expect(d.deFrente).toBe(0);
    expect(d.semArticulacao).toBe(0);
  });

  it("separa quem filmou de frente", () => {
    const d = diagnosticar([-1, -0.3, 0.2].map(deFrente));

    expect(d.deFrente).toBe(3);
    expect(d.aptos).toBe(0);
  });

  it("separa quem cortou uma articulação do quadro", () => {
    const d = diagnosticar([-1, -0.3, 0.2].map(semPe));

    expect(d.semArticulacao).toBe(3);
    expect(d.aptos).toBe(0);
  });

  it("fecha a soma mesmo quando os dois problemas ocorrem no mesmo quadro", () => {
    // Sem articulação e de frente ao mesmo tempo conta uma vez só, pelo motivo
    // que vem primeiro — senão o total não bate com o número de quadros e as
    // porcentagens da tela passam de 100%.
    const pontos = deFrente(-1);
    pontos[TORNOZELO_ESQ] = { x: 0.5, y: 1.4, visibility: 0.9 };

    const d = diagnosticar([pontos]);

    expect(d.semArticulacao + d.deFrente + d.aptos).toBe(d.quadros);
    expect(d.semArticulacao).toBe(1);
  });
});

describe("motivoDominante", () => {
  it("aponta a orientação quando ela domina a gravação", () => {
    expect(motivoDominante(diagnosticar([-1, -0.3, 0.2].map(deFrente)))).toBe("de-frente");
  });

  it("aponta o enquadramento quando ele domina", () => {
    expect(motivoDominante(diagnosticar([-1, -0.3, 0.2].map(semPe)))).toBe("sem-articulacao");
  });

  it("não culpa um motivo que atingiu só a minoria dos quadros", () => {
    // Um terço de frente e o resto legível: mandar a pessoa virar de lado seria
    // mandá-la refazer o que já estava certo.
    const d = diagnosticar([deFrente(-1), ...umaRepeticaoAte(0.2)]);

    expect(motivoDominante(d)).toBeNull();
  });

  it("não aponta motivo para gravação vazia", () => {
    expect(motivoDominante(diagnosticar([]))).toBeNull();
  });
});
