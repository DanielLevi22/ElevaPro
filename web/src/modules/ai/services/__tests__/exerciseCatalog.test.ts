import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O catálogo tem 57 exercícios e o coach dizia que estava vazio.
 *
 * A ferramenta mandava o modelo filtrar por "Ombros" e "Braços"; o banco guarda
 * `ombro`, `biceps` e `triceps`. Estes testes fixam a tradução e, sobretudo,
 * que grupo desconhecido responde "não conheço" em vez de "não existe nada".
 */

let rows: {
  name: string;
  muscle_group: string | null;
  venue?: string | null;
  category?: string | null;
}[];
let queryError: unknown;

const mockFrom = vi.fn(() => {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data: queryError ? null : rows, error: queryError });
  return builder;
});

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: () => mockFrom() },
}));

const {
  CATEGORIES,
  MUSCLE_GROUPS,
  VENUES,
  queryExercises,
  resolveMuscleGroups,
  unknownExerciseNames,
} = await import("../exerciseCatalog");

beforeEach(() => {
  vi.clearAllMocks();
  rows = [
    { name: "Desenvolvimento militar", muscle_group: "ombro" },
    { name: "Elevação lateral com halteres", muscle_group: "ombro" },
    { name: "Supino reto com barra", muscle_group: "peito" },
    { name: "Rosca direta com barra", muscle_group: "biceps" },
    { name: "Tríceps testa com barra W", muscle_group: "triceps" },
  ];
  queryError = null;
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
    expect(resolveMuscleGroups("pescoço")).toEqual([]);
    expect(resolveMuscleGroups("")).toEqual([]);
  });

  // Os exercícios existem, sob `pernas` e `ombro`. Antes o especialista pedia
  // panturrilha ou manguito rotador e ouvia "não conheço esse grupo".
  it.each([
    ["panturrilha", "pernas"],
    ["isquiotibiais", "pernas"],
    ["manguito", "ombro"],
    ["rotador", "ombro"],
    ["lombar", "costas"],
    ["abdutores", "gluteos"],
  ])("resolve %s para %s", (termo, esperado) => {
    expect(resolveMuscleGroups(termo)).toEqual([esperado]);
  });

  it("cobre os nove grupos que existem", () => {
    for (const grupo of MUSCLE_GROUPS) {
      expect(resolveMuscleGroups(grupo)).toContain(grupo);
    }
  });
});

describe("queryExercises", () => {
  const nomes = (r: { exercises: { name: string }[] }) => r.exercises.map((e) => e.name);

  it("filtra pelos grupos resolvidos, não pelo texto cru", async () => {
    const resultado = await queryExercises({ muscle_groups: ["Ombros"] });

    expect(nomes(resultado)).toEqual(["Desenvolvimento militar", "Elevação lateral com halteres"]);
  });

  it("consulta os dois grupos quando o pedido é braços", async () => {
    const resultado = await queryExercises({ muscle_groups: ["braços"] });

    expect(nomes(resultado)).toEqual(["Rosca direta com barra", "Tríceps testa com barra W"]);
  });

  // Uma chamada por grupo custava um turno do modelo cada: 27 segundos para
  // montar um ABC, medidos em 2026-08-12.
  it("resolve vários grupos numa consulta só, sem repetir", async () => {
    const resultado = await queryExercises({ muscle_groups: ["peito", "Braços", "biceps"] });

    expect(nomes(resultado)).toEqual([
      "Rosca direta com barra",
      "Supino reto com barra",
      "Tríceps testa com barra W",
    ]);
  });

  // O `.in()` comparava byte a byte: linha gravada "Peito" pelo painel de admin
  // não casava com `peito`, e o catálogo cheio voltava zero.
  it("acha a linha gravada com caixa e acento diferentes do grupo", async () => {
    rows = [
      { name: "Supino inclinado", muscle_group: "Peito" },
      { name: "Rosca concentrada", muscle_group: "Bíceps" },
      { name: "Agachamento livre", muscle_group: "PERNAS" },
    ];

    expect(nomes(await queryExercises({ muscle_groups: ["peito"] }))).toEqual(["Supino inclinado"]);
    expect(nomes(await queryExercises({ muscle_groups: ["biceps"] }))).toEqual([
      "Rosca concentrada",
    ]);
    expect(nomes(await queryExercises({ muscle_groups: ["pernas"] }))).toEqual([
      "Agachamento livre",
    ]);
  });

  // Era isto que fazia o coach afirmar que o catálogo estava vazio.
  it("responde 'grupo desconhecido' com a lista do que existe", async () => {
    const resultado = await queryExercises({ muscle_groups: ["pescoço"] });

    expect(resultado.unknownGroup).toEqual({
      requested: ["pescoço"],
      available: MUSCLE_GROUPS,
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // Catálogo cheio que não casa com o filtro é deriva de dado, não catálogo
  // vazio — e chegavam ao modelo como a mesma lista vazia.
  it("mostra os grupos crus do banco quando o filtro não casa com nada", async () => {
    rows = [
      { name: "Bench press", muscle_group: "chest" },
      { name: "Deadlift", muscle_group: "back" },
    ];

    const resultado = await queryExercises({ muscle_groups: ["peito"] });

    expect(resultado.total).toBe(0);
    expect(resultado.groupsInCatalog).toEqual(["chest", "back"]);
  });

  it("não fala em deriva quando o catálogo está de fato vazio", async () => {
    rows = [];

    const resultado = await queryExercises({ muscle_groups: ["peito"] });

    expect(resultado.total).toBe(0);
    expect(resultado.groupsInCatalog).toBeUndefined();
  });

  it("devolve o total para o modelo saber se viu tudo", async () => {
    const resultado = await queryExercises({ muscle_groups: ["ombro"] });

    expect(resultado.total).toBe(2);
    expect(resultado.exercises).toHaveLength(2);
  });

  it("propaga erro em vez de devolver lista vazia", async () => {
    queryError = { code: "42P01", message: "relation does not exist" };

    await expect(queryExercises({ muscle_groups: ["peito"] })).rejects.toMatchObject({
      code: "42P01",
    });
  });

  it("busca por nome sem exigir grupo", async () => {
    const resultado = await queryExercises({ search_term: "Supino" });

    expect(nomes(resultado)).toEqual(["Supino reto com barra"]);
  });

  // O modelo reescreve acento, e o `ilike` do PostgREST não atravessa acento.
  it("busca por nome sem acento e sem caixa", async () => {
    const resultado = await queryExercises({ search_term: "elevacao LATERAL" });

    expect(nomes(resultado)).toEqual(["Elevação lateral com halteres"]);
  });

  it("cruza grupo e termo em vez de escolher um dos dois", async () => {
    const resultado = await queryExercises({ muscle_groups: ["peito"], search_term: "rosca" });

    expect(resultado.total).toBe(0);
  });
});

describe("queryExercises — onde e que tipo", () => {
  const nomes = (r: { exercises: { name: string }[] }) => r.exercises.map((e) => e.name);

  beforeEach(() => {
    rows = [
      { name: "Leg press 45°", muscle_group: "pernas", venue: "academia", category: "forca" },
      {
        name: "Agachamento livre sem peso",
        muscle_group: "pernas",
        venue: "casa",
        category: "forca",
      },
      { name: "Flexão de braço", muscle_group: "peito", venue: "ambos", category: "forca" },
      {
        name: "Rotação externa com elástico",
        muscle_group: "ombro",
        venue: "ambos",
        category: "estabilizacao",
      },
      {
        name: "Alongamento de quadríceps em pé",
        muscle_group: "pernas",
        venue: "ambos",
        category: "alongamento",
      },
    ];
  });

  // Flexão e prancha estão marcadas `ambos`. Comparar por igualdade exata
  // esvaziaria o treino de quem não tem academia.
  it("quem treina em casa também recebe o que serve nos dois lugares", async () => {
    expect(nomes(await queryExercises({ venue: "casa" }))).toEqual([
      "Agachamento livre sem peso",
      "Alongamento de quadríceps em pé",
      "Flexão de braço",
      "Rotação externa com elástico",
    ]);
  });

  it("quem treina na academia não perde o que serve nos dois", async () => {
    const resultado = await queryExercises({ venue: "academia" });

    expect(nomes(resultado)).toContain("Leg press 45°");
    expect(nomes(resultado)).toContain("Flexão de braço");
    expect(nomes(resultado)).not.toContain("Agachamento livre sem peso");
  });

  it("filtra por tipo de trabalho", async () => {
    expect(nomes(await queryExercises({ category: "alongamento" }))).toEqual([
      "Alongamento de quadríceps em pé",
    ]);
  });

  // "core" é como o especialista fala; o banco guarda `estabilizacao`.
  it("aceita o sinônimo que a pessoa usa", async () => {
    expect(nomes(await queryExercises({ category: "core" }))).toEqual([
      "Rotação externa com elástico",
    ]);
    expect(await queryExercises({ venue: "home" })).toMatchObject({ total: 4 });
  });

  it("cruza grupo, lugar e tipo", async () => {
    const resultado = await queryExercises({
      muscle_groups: ["pernas"],
      venue: "casa",
      category: "forca",
    });

    expect(nomes(resultado)).toEqual(["Agachamento livre sem peso"]);
  });

  // Mesma regra do grupo desconhecido: dizer o que existe, não sumir.
  it("responde o que existe quando o filtro não é do vocabulário", async () => {
    const lugar = await queryExercises({ venue: "parque" });
    expect(lugar.unknownFilter).toEqual({
      field: "venue",
      requested: "parque",
      available: VENUES,
    });

    const tipo = await queryExercises({ category: "pilates" });
    expect(tipo.unknownFilter).toEqual({
      field: "category",
      requested: "pilates",
      available: CATEGORIES,
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("devolve a classificação junto do nome, para o coach poder dizer", async () => {
    const resultado = await queryExercises({ search_term: "Rotação externa" });

    expect(resultado.exercises[0]).toEqual({
      name: "Rotação externa com elástico",
      muscle_group: "ombro",
      venue: "ambos",
      category: "estabilizacao",
    });
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
