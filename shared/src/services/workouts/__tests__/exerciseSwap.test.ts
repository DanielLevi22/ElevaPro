import { describe, expect, it } from "vitest";
import type { Exercise } from "../../../types/workouts.types";
import { exerciseAlternatives } from "../exerciseSwap";

function exercicio(id: string, campos: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name: id,
    muscle_group: "Costas",
    venue: "ambos",
    category: "forca",
    description: null,
    video_url: null,
    is_verified: true,
    created_by: null,
    created_at: "2026-09-01T00:00:00Z",
    ...campos,
  };
}

const REMADA = exercicio("Remada curvada", { venue: "academia" });

describe("as alternativas da troca de exercício", () => {
  it("oferece até 3 do mesmo músculo e do mesmo trabalho, verificadas primeiro", () => {
    const catalogo = [
      REMADA,
      exercicio("Remada unilateral apoiada", { is_verified: false }),
      exercicio("Remada com halteres"),
      exercicio("Remada com elástico"),
      exercicio("Puxada alta"),
      exercicio("Supino reto", { muscle_group: "Peito" }),
      exercicio("Remo ergômetro", { category: "cardio" }),
    ];
    expect(
      exerciseAlternatives(catalogo, REMADA, { atHome: null, avoided: [] }).map((e) => e.id),
    ).toEqual(["Puxada alta", "Remada com elástico", "Remada com halteres"]);
  });

  it("em casa, só o que dá para fazer em casa", () => {
    const catalogo = [
      exercicio("Remada na máquina", { venue: "academia" }),
      exercicio("Remada com elástico", { venue: "casa" }),
    ];
    expect(
      exerciseAlternatives(catalogo, REMADA, { atHome: true, avoided: [] }).map((e) => e.id),
    ).toEqual(["Remada com elástico"]);
  });

  it("não oferece o que a pessoa pediu para ver menos, nem exercício privado de especialista", () => {
    const catalogo = [
      exercicio("Remada com halteres"),
      exercicio("Remada do especialista", { created_by: "especialista-1" }),
    ];
    expect(
      exerciseAlternatives(catalogo, REMADA, { atHome: null, avoided: ["Remada com halteres"] }),
    ).toEqual([]);
  });
});
