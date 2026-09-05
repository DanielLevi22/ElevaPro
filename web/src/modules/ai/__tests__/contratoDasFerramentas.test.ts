import { EXERCISE_CATEGORIES, EXERCISE_MUSCLE_GROUPS, EXERCISE_VENUES } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import { NUTRITION_COACH_PROMPT } from "../prompts/nutrition.prompts";
import { SPECIALIST_COACH_PROMPT } from "../prompts/specialist.prompts";
import {
  ANALYTICAL_COACH_PROMPT,
  EXPRESS_COACH_PROMPT,
  STUDENT_COACH_BASE_PROMPT,
} from "../prompts/student-coach.prompts";
import type { ToolDefinition } from "../providers/types";
import { CONVITE_DA_ANALISE_CORPORAL } from "../services/bodyScanContext";
import { FOOD_CATEGORIES } from "../services/foodCatalog";
import { BODY_SCAN_TOOL } from "../tools/bodyScanTools";
import { NUTRITION_TOOLS } from "../tools/nutritionTools";
import { STUDENT_COACH_TOOLS } from "../tools/studentCoachTools";
import { WORKOUT_TOOLS } from "../tools/workoutTools";

/**
 * Prompt, ferramenta e banco descrevem o mesmo vocabulário — e é quando um
 * deles fica para trás que nascem os defeitos mais caros do assistente.
 *
 * A ferramenta oferecia "Ombros" e "Braços"; o banco guarda `ombro`, `biceps` e
 * `triceps`. A busca voltava zero e o assistente anunciava catálogo vazio com
 * 57 exercícios no banco. Nada de lógica estava errado: as três descrições
 * tinham divergido, e nenhum teste olhava essa costura.
 *
 * Estes testes olham. Rodam sem chave e sem custo, e pegam a classe inteira.
 */

/** Os valores que uma ferramenta oferece ao modelo, num campo do schema. */
function opcoesDe(tool: ToolDefinition, campo: string): string[] {
  const props = (tool.input_schema as { properties?: Record<string, unknown> }).properties ?? {};
  const prop = props[campo] as { enum?: string[]; items?: { enum?: string[] } } | undefined;
  return prop?.enum ?? prop?.items?.enum ?? [];
}

function ferramenta(tools: ToolDefinition[], nome: string): ToolDefinition {
  const encontrada = tools.find((t) => t.name === nome);
  if (!encontrada) throw new Error(`ferramenta ${nome} não está registrada`);
  return encontrada;
}

/** Os nomes de ferramenta citados num roteiro, entre aspas simples. */
function citadasEm(prompt: string): string[] {
  return [...new Set([...prompt.matchAll(/'([a-z]+_[a-z_]+)'/g)].map((m) => m[1]))];
}

/**
 * O que o modelo lê antes de decidir: o roteiro fixo e os blocos de contexto.
 *
 * A análise corporal se apresenta pelo contexto e não pelo roteiro, e de
 * propósito — só quando existem análises. Anunciar uma ferramenta que voltaria
 * vazia gasta contexto em todo turno e convida a chamada inútil. O contrato
 * aceita as duas origens; o que ele não aceita é a ferramenta ser invisível.
 */
const ASSISTENTES = [
  {
    nome: "treino",
    tools: [...WORKOUT_TOOLS, BODY_SCAN_TOOL],
    prompts: [SPECIALIST_COACH_PROMPT, CONVITE_DA_ANALISE_CORPORAL],
  },
  {
    nome: "nutrição",
    tools: [...NUTRITION_TOOLS, BODY_SCAN_TOOL],
    prompts: [NUTRITION_COACH_PROMPT, CONVITE_DA_ANALISE_CORPORAL],
  },
  {
    nome: "aluno",
    tools: STUDENT_COACH_TOOLS,
    prompts: [STUDENT_COACH_BASE_PROMPT, EXPRESS_COACH_PROMPT, ANALYTICAL_COACH_PROMPT],
  },
];

describe("a ferramenta oferece o que o banco aceita", () => {
  // O defeito original: a lista da ferramenta e a do banco eram duas listas.
  it("grupo muscular", () => {
    expect(opcoesDe(ferramenta(WORKOUT_TOOLS, "query_exercises"), "muscle_groups")).toEqual([
      ...EXERCISE_MUSCLE_GROUPS,
    ]);
  });

  it("onde treinar", () => {
    expect(opcoesDe(ferramenta(WORKOUT_TOOLS, "query_exercises"), "venue")).toEqual([
      ...EXERCISE_VENUES,
    ]);
  });

  it("tipo de exercício", () => {
    expect(opcoesDe(ferramenta(WORKOUT_TOOLS, "query_exercises"), "category")).toEqual([
      ...EXERCISE_CATEGORIES,
    ]);
  });

  it("categoria de alimento", () => {
    expect(opcoesDe(ferramenta(NUTRITION_TOOLS, "query_foods"), "category")).toEqual([
      ...FOOD_CATEGORIES,
    ]);
  });
});

describe("o roteiro e as ferramentas falam da mesma lista", () => {
  it.each(ASSISTENTES)("$nome: o roteiro não cita ferramenta que não existe", ({
    tools,
    prompts,
  }) => {
    const registradas = tools.map((t) => t.name);
    const citadas = prompts.flatMap(citadasEm);
    // Só nomes que parecem ferramenta: o roteiro também cita colunas e campos.
    const parecemFerramenta = citadas.filter((c) => /^(query|propose|save)_/.test(c));

    expect(parecemFerramenta.filter((c) => !registradas.includes(c))).toEqual([]);
  });

  // Ferramenta que nenhum texto menciona é ferramenta que o modelo não sabe
  // que existe — e uma ferramenta invisível é código morto que parece vivo.
  it.each(ASSISTENTES)("$nome: nenhuma ferramenta registrada é invisível", ({ tools, prompts }) => {
    const texto = prompts.join("\n");

    expect(tools.map((t) => t.name).filter((nome) => !texto.includes(nome))).toEqual([]);
  });
});

describe("toda ferramenta se descreve", () => {
  const todas = [...WORKOUT_TOOLS, ...NUTRITION_TOOLS, ...STUDENT_COACH_TOOLS, BODY_SCAN_TOOL];

  it.each(todas.map((t) => t.name))("%s diz ao modelo para que serve", (nome) => {
    const tool = todas.find((t) => t.name === nome);

    expect(tool?.description?.length ?? 0).toBeGreaterThan(40);
  });
});
