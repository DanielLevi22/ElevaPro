import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CorpoSvg } from "../CorpoSvg";
import { escalaDeCor, SEM_DADO } from "../escalaDeCor";

/**
 * A afirmação que o POC existe para provar: a cor cai no músculo certo.
 *
 * No mapa 3D isso não era testável nem verdadeiro. As malhas do écorché são
 * `object_0..object_86`, partidas por material na exportação, e o de-para saía
 * de centroide de bounding box — um `object_27` pode conter meio peitoral e um
 * pedaço do deltoide, e não há teste que conserte isso, só o olho.
 *
 * Aqui a ligação é por nome, então ela é verificável.
 */

function pintar(volumes: { muscle: string; volume: number }[]) {
  const cores = escalaDeCor(volumes);
  const { container } = render(<CorpoSvg corPorGrupo={cores} corSemDado={SEM_DADO} />);
  return {
    grupos: (musculo: string) =>
      Array.from(container.querySelectorAll(`[data-musculo="${musculo}"]`)),
  };
}

describe("CorpoSvg", () => {
  it("pinta o músculo que o dado nomeia, e não outro", () => {
    const { grupos } = pintar([
      { muscle: "Peitoral", volume: 9000 },
      { muscle: "Glúteos", volume: 0 },
    ]);

    expect(grupos("Peitoral")[0]).toHaveAttribute("fill", "rgb(255, 46, 99)");
    expect(grupos("Glúteos")[0]).toHaveAttribute("fill", SEM_DADO);
  });

  // A descoberta que veio de desenhar: Ombros e Antebraço existem nas duas
  // vistas. Com `id` — que precisa ser único — voltaria a existir um de-para
  // (`ombros-frente`, `ombros-costas`), que é a coisa que o 3D nos ensinou a
  // não querer. Com `data-musculo`, um nome pinta todas as ocorrências.
  it("pinta o mesmo músculo nas duas vistas com uma entrada só", () => {
    const { grupos } = pintar([{ muscle: "Ombros", volume: 5000 }]);
    const ombros = grupos("Ombros");

    expect(ombros).toHaveLength(2);
    for (const g of ombros) {
      expect(g).toHaveAttribute("fill", "rgb(255, 46, 99)");
    }
  });

  it("cobre os onze grupos que o app conhece", () => {
    const { grupos } = pintar([]);
    const faltando = [
      "Peitoral",
      "Costas",
      "Ombros",
      "Bíceps",
      "Tríceps",
      "Antebraço",
      "Abdômen",
      "Glúteos",
      "Quadríceps",
      "Isquiotibiais",
      "Panturrilha",
    ].filter((m) => grupos(m).length === 0);

    expect(faltando).toEqual([]);
  });

  // "Não treinou" e "treinou pouco" precisam ser distinguíveis a olho: é a
  // diferença entre descanso planejado e estímulo insuficiente.
  it("distingue ausência de estímulo de estímulo baixo", () => {
    const { grupos } = pintar([
      { muscle: "Bíceps", volume: 1 },
      { muscle: "Tríceps", volume: 0 },
    ]);

    expect(grupos("Bíceps")[0].getAttribute("fill")).not.toBe(SEM_DADO);
    expect(grupos("Tríceps")[0]).toHaveAttribute("fill", SEM_DADO);
  });
});
