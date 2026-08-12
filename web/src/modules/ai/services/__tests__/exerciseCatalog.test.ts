import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O catálogo tem 57 exercícios e o coach dizia que estava vazio.
 *
 * A ferramenta mandava o modelo filtrar por "Ombros" e "Braços"; o banco guarda
 * `ombro`, `biceps` e `triceps`. Estes testes fixam a tradução e, sobretudo,
 * que grupo desconhecido responde "não conheço" em vez de "não existe nada".
 */

let rows: { name: string; muscle_group: string }[];
let total: number;
let queryError: unknown;
let filters: { in?: [string, string[]]; ilike?: [string, string] };

const mockFrom = vi.fn(() => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.in = vi.fn((column: string, values: string[]) => {
    filters.in = [column, values];
    return builder;
  });
  builder.ilike = vi.fn((column: string, value: string) => {
    filters.ilike = [column, value];
    return builder;
  });
  // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data: queryError ? null : rows, error: queryError, count: total });
  return builder;
});

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: () => mockFrom() },
}));

const { MUSCLE_GROUPS, queryExercises, resolveMuscleGroups, unknownExerciseNames } = await import(
  "../exerciseCatalog"
);

beforeEach(() => {
  vi.clearAllMocks();
  rows = [{ name: "Desenvolvimento militar", muscle_group: "ombro" }];
  total = 6;
  queryError = null;
  filters = {};
});

describe("resolveMuscleGroups", () => {
  it.each([
    ["Ombros", ["ombro"]],
    ["ombro", ["ombro"]],
    ["OMBRO", ["ombro"]],
    ["Glúteos", ["gluteos"]],
    ["Abdômen", ["abdomen"]],
    ["Peito", ["peito"]],
    ["  costas  ", ["costas"]],
  ])("resolve %s", (termo, esperado) => {
    expect(resolveMuscleGroups(termo)).toEqual(esperado);
  });

  // No banco não existe "braços": são dois grupos.
  it("expande braços em biceps e triceps", () => {
    expect(resolveMuscleGroups("Braços")).toEqual(["biceps", "triceps"]);
    expect(resolveMuscleGroups("bracos")).toEqual(["biceps", "triceps"]);
  });

  it("não inventa grupo para termo desconhecido", () => {
    expect(resolveMuscleGroups("panturrilha")).toEqual([]);
    expect(resolveMuscleGroups("")).toEqual([]);
  });

  it("cobre os nove grupos que existem", () => {
    for (const grupo of MUSCLE_GROUPS) {
      expect(resolveMuscleGroups(grupo)).toContain(grupo);
    }
  });
});

describe("queryExercises", () => {
  it("filtra pelos grupos resolvidos, não pelo texto cru", async () => {
    await queryExercises({ muscle_groups: ["Ombros"] });

    expect(filters.in).toEqual(["muscle_group", ["ombro"]]);
    expect(filters.ilike).toBeUndefined();
  });

  it("consulta os dois grupos quando o pedido é braços", async () => {
    await queryExercises({ muscle_groups: ["braços"] });

    expect(filters.in).toEqual(["muscle_group", ["biceps", "triceps"]]);
  });

  // Uma chamada por grupo custava um turno do modelo cada: 27 segundos para
  // montar um ABC, medidos em 2026-08-12.
  it("resolve vários grupos numa consulta só, sem repetir", async () => {
    await queryExercises({ muscle_groups: ["peito", "Braços", "biceps"] });

    expect(filters.in).toEqual(["muscle_group", ["peito", "biceps", "triceps"]]);
  });

  // Era isto que fazia o coach afirmar que o catálogo estava vazio.
  it("responde 'grupo desconhecido' com a lista do que existe", async () => {
    const resultado = await queryExercises({ muscle_groups: ["panturrilha"] });

    expect(resultado.unknownGroup).toEqual({
      requested: ["panturrilha"],
      available: MUSCLE_GROUPS,
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("devolve o total para o modelo saber se viu tudo", async () => {
    const resultado = await queryExercises({ muscle_groups: ["ombro"] });

    expect(resultado.total).toBe(6);
    expect(resultado.exercises).toHaveLength(1);
  });

  it("propaga erro em vez de devolver lista vazia", async () => {
    queryError = { code: "42P01", message: "relation does not exist" };

    await expect(queryExercises({ muscle_groups: ["peito"] })).rejects.toMatchObject({
      code: "42P01",
    });
  });

  it("busca por nome sem exigir grupo", async () => {
    await queryExercises({ search_term: "Supino" });

    expect(filters.ilike).toEqual(["name", "%Supino%"]);
    expect(filters.in).toBeUndefined();
  });
});

describe("unknownExerciseNames", () => {
  beforeEach(() => {
    rows = [
      { name: "Supino reto com barra", muscle_group: "peito" },
      { name: "Elevação lateral com halteres", muscle_group: "ombro" },
    ];
  });

  // O modelo reescreve a caixa do que leu, e reescreve acento. Um `in` exato
  // acusaria como inexistente todo exercício que ele propõe.
  it("aceita o nome com a caixa trocada pelo modelo", async () => {
    const faltando = await unknownExerciseNames(["Supino Reto Com Barra"]);
    expect(faltando).toEqual([]);
  });

  it("aceita nome sem acento", async () => {
    const faltando = await unknownExerciseNames(["Elevacao lateral com halteres"]);
    expect(faltando).toEqual([]);
  });

  it("aponta o que não existe, e só ele", async () => {
    const faltando = await unknownExerciseNames([
      "Supino reto com barra",
      "Supino marciano invertido",
    ]);
    expect(faltando).toEqual(["Supino marciano invertido"]);
  });

  it("não consulta nada quando não há nome", async () => {
    expect(await unknownExerciseNames([])).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
