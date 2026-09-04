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

    const vermelho = (m: string) => Number(cores.get(m)?.match(/\d+/g)?.[0] ?? 0);

    // Saiu do fundo da escala, mas continua claramente abaixo do topo.
    expect(vermelho("Bíceps")).toBeGreaterThan(90);
    expect(vermelho("Bíceps")).toBeLessThan(vermelho("Quadríceps") - 60);
  });

  // Regressão do defeito que o log tinha: num corpus real os seis músculos
  // saíam quase da mesma cor, e o mapa deixava de responder à pergunta que
  // existe para responder — qual sofreu mais.
  it("mantém distância visível entre o maior e o menor de um corpus real", () => {
    const cores = escalaDeCor([
      { muscle: "Quadríceps", volume: 24000 },
      { muscle: "Glúteos", volume: 18000 },
      { muscle: "Isquiotibiais", volume: 15000 },
      { muscle: "Panturrilha", volume: 6000 },
      { muscle: "Costas", volume: 4000 },
      { muscle: "Abdômen", volume: 2200 },
    ]);

    const vermelho = (m: string) => Number(cores.get(m)?.match(/\d+/g)?.[0] ?? 0);
    const distancia = vermelho("Quadríceps") - vermelho("Abdômen");

    if (distancia < 100) {
      throw new Error(
        `ESCALA ACHATADA: o maior e o menor volume do corpus ficaram a ${distancia} de distância no vermelho — com onze vezes de diferença entre eles, o mapa não separa e não informa`,
      );
    }
  });

  it("não quebra com corpus vazio", () => {
    expect(escalaDeCor([]).size).toBe(0);
  });
});
