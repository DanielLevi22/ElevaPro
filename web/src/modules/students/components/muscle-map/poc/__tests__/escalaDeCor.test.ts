import { describe, expect, it } from "vitest";
import { escalaDeCor, SEM_DADO } from "../escalaDeCor";

/**
 * O seam do POC é a escala: entra volume por músculo, sai cor. Determinístico,
 * sem DOM e sem SVG — o desenho é arte, a escala é regra.
 */

describe("escalaDeCor", () => {
  it("dá o tom mais quente ao músculo de maior volume", () => {
    const cores = escalaDeCor([
      { muscle: "Quadríceps", volume: 8000 },
      { muscle: "Bíceps", volume: 500 },
    ]);

    expect(cores.get("Quadríceps")).toBe("rgb(255, 46, 99)");
    expect(cores.get("Bíceps")).not.toBe(cores.get("Quadríceps"));
  });

  // "Não treinou" e "treinou pouco" são coisas diferentes. A versão 3D pintava
  // as duas com o tom mínimo, e o mapa mentia sobre o descanso.
  it("deixa de fora quem não tem volume, para o mapa não fingir treino", () => {
    const cores = escalaDeCor([
      { muscle: "Peitoral", volume: 1000 },
      { muscle: "Panturrilha", volume: 0 },
    ]);

    expect(cores.has("Panturrilha")).toBe(false);
    expect(SEM_DADO).toBe("#27272a");
  });

  // Em escala linear a tonelagem de perna esmaga a de braço e o bíceps fica no
  // mínimo esteja ele descansado ou destruído.
  it("separa ordens de grandeza diferentes em vez de achatar o menor", () => {
    const cores = escalaDeCor([
      { muscle: "Quadríceps", volume: 20000 },
      { muscle: "Bíceps", volume: 800 },
    ]);

    const biceps = cores.get("Bíceps") ?? "";
    const canais = biceps.match(/\d+/g)?.map(Number) ?? [];

    // Vermelho bem acima do frio (63) prova que o bíceps saiu do fundo da escala.
    expect(canais[0]).toBeGreaterThan(150);
  });

  it("não quebra com corpus vazio", () => {
    expect(escalaDeCor([]).size).toBe(0);
  });
});
