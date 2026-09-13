import { describe, expect, it } from "vitest";
import type { Workout } from "../../types/workouts.types";
import { gruposDoTreino } from "../treino";

const treino = (grupo: string | null, dosExercicios: (string | null)[]): Workout =>
  ({
    muscle_group: grupo,
    exercises: dosExercicios.map((g) => ({ exercise: { muscle_group: g } })),
  }) as Workout;

describe("gruposDoTreino", () => {
  it("abre pelo grupo do treino e segue pelos dos exercícios, sem repetir", () => {
    expect(gruposDoTreino(treino("Costas", ["Costas", "Bíceps", "bíceps"]))).toEqual([
      "Costas",
      "Bíceps",
    ]);
  });

  it("para em três, que é o que cabe na linha do kit", () => {
    expect(gruposDoTreino(treino(null, ["Peito", "Ombros", "Tríceps", "Core"]))).toHaveLength(3);
  });

  it("sem grupo nenhum não inventa um", () => {
    expect(gruposDoTreino(treino(null, [null]))).toEqual([]);
  });
});
