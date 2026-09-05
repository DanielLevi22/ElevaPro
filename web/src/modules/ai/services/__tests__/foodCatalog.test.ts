import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O catálogo de alimentos, e a categoria que só agora existe.
 *
 * `foods.category` era `NULL` em todas as linhas, e por isso a ferramenta não
 * filtrava: filtrar devolveria zero em toda chamada, e o modelo concluiria que
 * o catálogo está vazio — exatamente o que `muscle_group` fez no assistente de
 * treino. Com a curadoria feita, o filtro passa a existir; estes testes fixam
 * que ele nunca volta a responder vazio quando o vazio seria mentira.
 */

let rows: { id?: string; name: string; category?: string | null }[];
let total: number;
let queryError: unknown;
let filtros: { eq?: [string, string]; ilike?: [string, string] };

const mockFrom = vi.fn(() => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.eq = vi.fn((coluna: string, valor: string) => {
    filtros.eq = [coluna, valor];
    return builder;
  });
  builder.ilike = vi.fn((coluna: string, valor: string) => {
    filtros.ilike = [coluna, valor];
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

const { FOOD_CATEGORIES, foodIdsByName, queryFoods, resolveFoodCategory, unknownFoodNames } =
  await import("../foodCatalog");

beforeEach(() => {
  vi.clearAllMocks();
  rows = [
    { id: "f1", name: "Frango (peito grelhado)", category: "proteina" },
    { id: "f2", name: "Arroz integral cozido", category: "carboidrato" },
  ];
  total = 28;
  queryError = null;
  filtros = {};
});

describe("resolveFoodCategory", () => {
  it.each([
    ["proteina", "proteina"],
    ["Proteínas", "proteina"],
    ["CARBO", "carboidrato"],
    ["cereais", "carboidrato"],
    ["verduras", "hortalica"],
    ["legumes", "hortalica"],
    ["oleaginosas", "gordura"],
    ["lácteos", "laticinio"],
    ["feijão", "leguminosa"],
  ])("resolve %s para %s", (termo, esperado) => {
    expect(resolveFoodCategory(termo)).toBe(esperado);
  });

  it("não inventa categoria para termo desconhecido", () => {
    expect(resolveFoodCategory("sobremesa")).toBeNull();
    expect(resolveFoodCategory("")).toBeNull();
  });

  it("conhece as nove categorias que o banco aceita", () => {
    for (const categoria of FOOD_CATEGORIES) {
      expect(resolveFoodCategory(categoria)).toBe(categoria);
    }
  });
});

describe("queryFoods", () => {
  it("filtra pela categoria resolvida, não pelo texto cru", async () => {
    await queryFoods({ category: "Proteínas" });

    expect(filtros.eq).toEqual(["category", "proteina"]);
  });

  it("busca por nome sem exigir categoria", async () => {
    await queryFoods({ search_term: "frango" });

    expect(filtros.ilike).toEqual(["name", "%frango%"]);
    expect(filtros.eq).toBeUndefined();
  });

  it("cruza categoria e nome em vez de escolher uma", async () => {
    await queryFoods({ category: "proteina", search_term: "frango" });

    expect(filtros.eq).toEqual(["category", "proteina"]);
    expect(filtros.ilike).toEqual(["name", "%frango%"]);
  });

  it("sem filtro nenhum, o catálogo continua alcançável", async () => {
    await queryFoods({});

    expect(filtros.eq).toBeUndefined();
    expect(filtros.ilike).toBeUndefined();
  });

  // Devolver vazio aqui é o que faz o modelo anunciar catálogo vazio com o
  // catálogo cheio. Dizer o que existe deixa ele se corrigir sozinho.
  it("categoria fora do vocabulário responde o que existe", async () => {
    const resultado = await queryFoods({ category: "sobremesa" });

    expect(resultado.unknownCategory).toEqual({
      requested: "sobremesa",
      available: FOOD_CATEGORIES,
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // O catálogo não cabe mais inteiro numa resposta: sem o total, o modelo
  // monta o plano achando que viu tudo.
  it("devolve o total para o modelo saber se viu tudo", async () => {
    const resultado = await queryFoods({ category: "proteina" });

    expect(resultado.total).toBe(28);
    expect(resultado.foods).toHaveLength(2);
  });

  it("propaga erro em vez de devolver lista vazia", async () => {
    queryError = { code: "42703", message: "column does not exist" };

    await expect(queryFoods({})).rejects.toMatchObject({ code: "42703" });
  });
});

describe("unknownFoodNames", () => {
  // O modelo reescreve caixa e acento do que leu, e `diet_meal_items.food_id` é
  // NOT NULL: nome que não casa vira item de refeição que não existe.
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
  // Sem o id não há item de refeição: a coluna é NOT NULL com ON DELETE restrict.
  it("mapeia o nome que o modelo escreveu para o id do catálogo", async () => {
    const mapa = await foodIdsByName(["frango (peito grelhado)"]);

    expect(mapa.get("frango (peito grelhado)")).toBe("f1");
  });

  it("não inventa id para alimento inexistente", async () => {
    expect((await foodIdsByName(["Farinha de grilo"])).size).toBe(0);
  });
});
