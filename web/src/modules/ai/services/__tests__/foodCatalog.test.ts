import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O catálogo de alimentos.
 *
 * O ponto que estes testes fixam é o que **não** existe: filtro por categoria.
 * `foods.category` é NULL nos 44 alimentos, então uma ferramenta que filtrasse
 * por ela devolveria zero sempre — e o modelo concluiria que o catálogo está
 * vazio, exatamente como aconteceu com `muscle_group` no coach de treino.
 */

let rows: { id?: string; name: string }[];
let total: number;
let queryError: unknown;
let selected: string;
let filters: { ilike?: [string, string] };

const mockFrom = vi.fn(() => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn((columns: string) => {
    selected = columns;
    return builder;
  });
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
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

const { foodIdsByName, queryFoods, unknownFoodNames } = await import("../foodCatalog");

beforeEach(() => {
  vi.clearAllMocks();
  rows = [
    { id: "f1", name: "Frango (peito grelhado)" },
    { id: "f2", name: "Arroz integral cozido" },
  ];
  total = 44;
  queryError = null;
  selected = "";
  filters = {};
});

describe("queryFoods", () => {
  it("busca por nome", async () => {
    await queryFoods({ search_term: "frango" });
    expect(filters.ilike).toEqual(["name", "%frango%"]);
  });

  it("devolve o catálogo inteiro sem filtro", async () => {
    const r = await queryFoods({});
    expect(filters.ilike).toBeUndefined();
    expect(r.total).toBe(44);
  });

  // Se um dia alguém acrescentar filtro por categoria, este teste cai — e é para
  // cair: a coluna é NULL em 100% das linhas.
  it("não pede a coluna category", async () => {
    await queryFoods({});
    expect(selected).not.toContain("category");
  });

  it("propaga erro em vez de devolver lista vazia", async () => {
    queryError = { code: "42P01", message: "relation does not exist" };
    await expect(queryFoods({})).rejects.toMatchObject({ code: "42P01" });
  });
});

describe("unknownFoodNames", () => {
  it("aceita caixa e acento trocados pelo modelo", async () => {
    expect(await unknownFoodNames(["FRANGO (PEITO GRELHADO)"])).toEqual([]);
    expect(await unknownFoodNames(["Arroz integral cozido"])).toEqual([]);
  });

  it("aponta só o que não existe", async () => {
    const faltando = await unknownFoodNames(["Frango (peito grelhado)", "Farinha de grilo"]);
    expect(faltando).toEqual(["Farinha de grilo"]);
  });

  it("não consulta nada com lista vazia", async () => {
    expect(await unknownFoodNames([])).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("foodIdsByName", () => {
  // `diet_meal_items.food_id` é NOT NULL: sem o id não há item de refeição.
  it("mapeia o nome que o modelo escreveu para o id do catálogo", async () => {
    const mapa = await foodIdsByName(["frango (peito grelhado)"]);
    expect(mapa.get("frango (peito grelhado)")).toBe("f1");
  });

  it("não inventa id para alimento inexistente", async () => {
    const mapa = await foodIdsByName(["Farinha de grilo"]);
    expect(mapa.size).toBe(0);
  });
});
