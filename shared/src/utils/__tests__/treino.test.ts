import { describe, expect, it } from "vitest";
import type { Workout } from "../../types/workouts.types";
import { contarExercicios, gruposDoTreino } from "../treino";

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

describe("contarExercicios", () => {
  it("usa a contagem que a consulta trouxe", () => {
    expect(contarExercicios({ exercises_count: 6 } as Workout)).toBe(6);
  });

  it("conta a lista quando veio a lista e não a contagem", () => {
    expect(contarExercicios(treino(null, ["Peito", "Costas"]))).toBe(2);
  });

  it("sem nenhum dos dois, devolve undefined — zero afirmaria o que não se sabe", () => {
    expect(contarExercicios({} as Workout)).toBeUndefined();
  });
});
