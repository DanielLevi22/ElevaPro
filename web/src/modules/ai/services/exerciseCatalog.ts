import {
  EXERCISE_CATEGORIES,
  EXERCISE_MUSCLE_GROUPS,
  EXERCISE_VENUES,
  type ExerciseCategory,
  type ExerciseMuscleGroup,
  type ExerciseVenue,
} from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Consulta do catálogo de exercícios para o coach.
 *
 * A ferramenta pedia ao modelo para filtrar por "Peito, Costas, Pernas, Ombros,
 * Braços", e o banco guarda em minúsculo, singular e sem acento. `Ombros` e
 * `Braços` devolviam zero — daí a frase que o especialista viu: "ainda não há
 * exercícios de ombros cadastrados", com 57 exercícios no banco e 6 de ombro.
 *
 * Aqui o termo do modelo é resolvido para os grupos que existem, em vez de ir
 * cru para o `ilike`.
 */

/**
 * O vocabulário vem de `@elevapro/shared`: é o mesmo que o painel de admin
 * oferece ao criar exercício e o mesmo que o CHECK do banco aceita. Enquanto
 * cada um tinha a sua lista, o admin gravava "Peito" e a busca procurava
 * "peito".
 */
export const MUSCLE_GROUPS = EXERCISE_MUSCLE_GROUPS;
export const VENUES = EXERCISE_VENUES;
export const CATEGORIES = EXERCISE_CATEGORIES;

export type MuscleGroup = ExerciseMuscleGroup;
export type Venue = ExerciseVenue;
export type Category = ExerciseCategory;

/**
 * Termos que o modelo (ou o especialista) usa e que não são o valor do banco.
 * "Braços" vira dois grupos porque no banco não existe um só.
 */
const SYNONYMS: Record<string, MuscleGroup[]> = {
  bracos: ["biceps", "triceps"],
  braco: ["biceps", "triceps"],
  ombros: ["ombro"],
  deltoides: ["ombro"],
  deltoide: ["ombro"],
  peitoral: ["peito"],
  dorsal: ["costas"],
  dorsais: ["costas"],
  perna: ["pernas"],
  quadriceps: ["pernas"],
  posterior: ["pernas"],
  gluteo: ["gluteos"],
  abdominal: ["abdomen"],
  abdominais: ["abdomen"],
  core: ["abdomen"],
  aerobico: ["cardio"],
  // Sem estes, pedir "panturrilha" ou "manguito rotador" respondia "não conheço
  // esse grupo" — com os exercícios no banco, sob `pernas` e `ombro`.
  panturrilha: ["pernas"],
  panturrilhas: ["pernas"],
  isquiotibiais: ["pernas"],
  adutores: ["pernas"],
  abdutores: ["gluteos"],
  manguito: ["ombro"],
  rotador: ["ombro"],
  escapula: ["ombro"],
  trapezio: ["costas"],
  lombar: ["costas"],
  cervical: ["costas"],
};

/** Como a pessoa fala, para o valor que o banco guarda. */
const VENUE_SYNONYMS: Record<string, Venue> = {
  academias: "academia",
  gym: "academia",
  musculacao: "academia",
  sala: "academia",
  domicilio: "casa",
  home: "casa",
  residencia: "casa",
  ambas: "ambos",
  qualquer: "ambos",
};

const CATEGORY_SYNONYMS: Record<string, Category> = {
  forcas: "forca",
  hipertrofia: "forca",
  resistencia: "forca",
  aerobico: "cardio",
  condicionamento: "cardio",
  alongamentos: "alongamento",
  flexibilidade: "alongamento",
  mobilidades: "mobilidade",
  mobilizacao: "mobilidade",
  postura: "postural",
  posturais: "postural",
  core: "estabilizacao",
  estabilidade: "estabilizacao",
  estabilizadores: "estabilizacao",
  manguito: "estabilizacao",
};

/** Marcas de acentuação que o NFD separa da letra base. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Sem acento, sem caixa, sem espaço nas pontas — como o banco guarda. */
function normalize(term: string): string {
  return term.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

/**
 * Traduz o termo do modelo para os grupos reais.
 *
 * Devolve lista vazia quando não reconhece — e é isso que permite responder
 * "não conheço esse grupo, os que existem são X" em vez de "não há exercícios".
 */
export function resolveMuscleGroups(term: string): MuscleGroup[] {
  const normalized = normalize(term);
  if (normalized.length === 0) return [];

  const exact = MUSCLE_GROUPS.find((g) => g === normalized);
  if (exact) return [exact];

  const synonym = SYNONYMS[normalized];
  if (synonym) return synonym;

  // Singular/plural que não está na tabela de sinônimos: "costa" → "costas".
  const partial = MUSCLE_GROUPS.filter((g) => g.startsWith(normalized) || normalized.startsWith(g));
  return partial;
}

/**
 * Traduz o termo do modelo para o valor do banco, ou `null` se não reconhece.
 *
 * Mesmo contrato de `resolveMuscleGroups`: não reconhecer é resposta, não
 * ausência — é o que deixa a ferramenta dizer "não conheço, o que existe é X"
 * em vez de devolver lista vazia e o coach concluir que não há exercício.
 */
function resolveTerm<T extends string>(
  term: string,
  valores: readonly T[],
  sinonimos: Record<string, T>,
): T | null {
  const normalized = normalize(term);
  if (normalized.length === 0) return null;
  return valores.find((v) => v === normalized) ?? sinonimos[normalized] ?? null;
}

export interface ExerciseQueryInput {
  /** Vários de uma vez: uma chamada por grupo custava um turno do modelo cada. */
  muscle_groups?: string[];
  search_term?: string;
  /** `casa` para treino sem academia — traz também o que serve nos dois. */
  venue?: string;
  /** `alongamento`, `mobilidade`, `postural`, `estabilizacao`, `forca`, `cardio`. */
  category?: string;
}

export interface ExerciseQueryResult {
  /**
   * Os nomes, agrupados pelo grupo muscular.
   *
   * Antes cada exercício vinha como um objeto de quatro campos, e três deles
   * eram eco do filtro que o modelo acabara de mandar: quem pede
   * `muscle_groups:["peito"], venue:"gym"` já sabe que tudo que voltou é peito
   * e é de academia. Medido no catálogo de 181, o formato antigo gastava 2.333
   * tokens no teto de 80 itens; agrupado, gasta 636 — e é reenviado a cada
   * turno seguinte da mesma requisição.
   *
   * O que o modelo precisa de verdade é o `name`, exato, porque é ele que vai
   * para `propose_workouts` e é por ele que a gravação casa.
   */
  por_grupo: Record<string, string[]>;
  /**
   * Onde treinar e que tipo de exercício é — **só quando variam** no resultado.
   *
   * Filtrou por academia? Então dizer "gym" em cada linha não informa nada.
   * Não filtrou, e voltou casa e academia misturados? Aí a distinção importa
   * para montar o treino, e ela aparece.
   */
  venue_por_exercicio?: Record<string, string>;
  category_por_exercicio?: Record<string, string>;
  /** Quantos existem no filtro — o modelo precisa saber se está vendo tudo. */
  total: number;
  /** Preenchido quando o grupo pedido não existe, com os que existem. */
  unknownGroup?: { requested: string[]; available: readonly string[] };
  /** Mesmo papel, para `venue` e `category`: dizer o que existe, não sumir. */
  unknownFilter?: {
    field: "venue" | "category";
    requested: string;
    available: readonly string[];
  };
  /**
   * Os valores de `muscle_group` que o banco realmente tem, listados só quando
   * o filtro não casou com nada. É o que separa "catálogo vazio" de "o catálogo
   * está cheio e chama seus grupos de outro jeito" — sem isto, os dois chegam
   * ao modelo como a mesma lista vazia, e ele anuncia que não há exercícios.
   */
  groupsInCatalog?: string[];
}

/**
 * Teto alto o bastante para caber vários grupos numa consulta só — uma divisão
 * ABC pede sete de uma vez, e o catálogo inteiro tem 57.
 */
const MAX_RESULTS = 80;

/** A linha do catálogo que interessa aqui: o que classifica, nada mais. */
interface CatalogRow {
  name: string;
  muscle_group: string | null;
  venue: string | null;
  category: string | null;
}

/**
 * O catálogo lido uma vez por minuto, não uma vez por consulta.
 *
 * Montar uma divisão ABC dispara `query_exercises` várias vezes no mesmo turno,
 * e `unknownExerciseNames` lê de novo na hora de gravar — eram cinco ou seis
 * varreduras da tabela inteira para responder uma pergunta só. O catálogo muda
 * quando alguém cadastra exercício, o que não acontece durante uma conversa.
 *
 * Um minuto é curto o bastante para um exercício recém-cadastrado aparecer sem
 * ninguém entender por que não apareceu, e longo o bastante para cobrir a
 * conversa inteira com uma leitura.
 */
const VALIDADE_MS = 60_000;

let cache: { linhas: CatalogRow[]; expiraEm: number } | null = null;

/** Esquece o catálogo guardado. Existe para o teste não herdar o do anterior. */
export function esquecerCatalogo(): void {
  cache = null;
}

/** O catálogo inteiro, nas quatro colunas que classificam. */
async function readCatalog(): Promise<CatalogRow[]> {
  if (cache && Date.now() < cache.expiraEm) return cache.linhas;

  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("name, muscle_group, venue, category");

  // Erro tem que subir: era indistinguível de "não achei nada", e o modelo
  // afirmava com convicção que o catálogo estava vazio.
  //
  // E não guarda: cachear a falha faria um minuto de indisponibilidade do banco
  // virar um minuto de "o catálogo está vazio" para todo mundo.
  if (error) throw error;

  const linhas = (data ?? []) as CatalogRow[];
  cache = { linhas, expiraEm: Date.now() + VALIDADE_MS };
  return linhas;
}

/**
 * Quais destes nomes não existem no catálogo.
 *
 * A gravação casa por nome exato e depois tenta um `ilike`; o que não casa é
 * descartado em silêncio. Sem esta checagem antes, o especialista aprova seis
 * exercícios e recebe quatro, sem nada dizendo o contrário.
 */
export async function unknownExerciseNames(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];

  // Lê o catálogo inteiro em vez de filtrar por `in`: o modelo reescreve a
  // caixa do que leu ("Supino Reto com Barra" para "Supino reto com barra"), e
  // um `in` exato acusaria como inexistente todo exercício que ele propõe. São
  // 57 linhas de duas colunas — comparar normalizado sai mais barato que errar.
  const existentes = new Set((await readCatalog()).map((e) => normalize(e.name)));
  return names.filter((n) => !existentes.has(normalize(n)));
}

/** Os nomes sob o grupo muscular a que pertencem, na ordem em que vieram. */
function agruparPorMusculo(linhas: CatalogRow[]): Record<string, string[]> {
  const grupos: Record<string, string[]> = {};
  for (const linha of linhas) {
    const grupo = linha.muscle_group ?? "(sem grupo)";
    grupos[grupo] ??= [];
    grupos[grupo].push(linha.name);
  }
  return grupos;
}

/**
 * O campo só entra no resultado quando tem mais de um valor.
 *
 * Um valor só significa que o filtro já o determinou — repeti-lo em cada linha
 * é devolver ao modelo o que ele mandou. Dois ou mais, e a distinção passa a
 * dizer alguma coisa sobre o treino a montar.
 */
function soQuandoVaria(
  linhas: CatalogRow[],
  campo: "venue" | "category",
  chave: string,
): Record<string, Record<string, string>> {
  const valores = new Set(linhas.map((l) => l[campo] ?? ""));
  if (valores.size < 2) return {};

  const mapa: Record<string, string> = {};
  for (const linha of linhas) mapa[linha.name] = linha[campo] ?? "";
  return { [chave]: mapa };
}

export async function queryExercises(input: ExerciseQueryInput): Promise<ExerciseQueryResult> {
  const pedidos = input.muscle_groups ?? [];
  const groups = new Set(pedidos.flatMap(resolveMuscleGroups));
  const naoReconhecidos = pedidos.filter((p) => resolveMuscleGroups(p).length === 0);

  if (pedidos.length > 0 && groups.size === 0) {
    // Devolver lista vazia aqui foi o que fez o coach afirmar que o banco
    // estava vazio. Dizer o que existe deixa o modelo se corrigir sozinho.
    return {
      por_grupo: {},
      total: 0,
      unknownGroup: { requested: naoReconhecidos, available: MUSCLE_GROUPS },
    };
  }

  const venue = input.venue ? resolveTerm(input.venue, VENUES, VENUE_SYNONYMS) : null;
  if (input.venue && !venue) {
    return {
      por_grupo: {},
      total: 0,
      unknownFilter: { field: "venue", requested: input.venue, available: VENUES },
    };
  }

  const category = input.category
    ? resolveTerm(input.category, CATEGORIES, CATEGORY_SYNONYMS)
    : null;
  if (input.category && !category) {
    return {
      por_grupo: {},
      total: 0,
      unknownFilter: { field: "category", requested: input.category, available: CATEGORIES },
    };
  }

  // O filtro acontece aqui, não num `.in()`: aquele compara byte a byte, e uma
  // linha gravada como "Peito" ou "Bíceps" — pelo painel de admin, por um seed
  // antigo, por importação — não casava com `peito` nem `biceps`. O catálogo
  // inteiro voltava zero com as 57 linhas no lugar. `resolveMuscleGroups`
  // atravessa caixa, acento e sinônimo, e aqui ele resolve os dois lados.
  const catalogo = await readCatalog();
  const termo = input.search_term ? normalize(input.search_term) : null;

  const encontrados = catalogo.filter((linha) => {
    if (groups.size > 0) {
      const grupoDaLinha = resolveMuscleGroups(linha.muscle_group ?? "");
      if (!grupoDaLinha.some((g) => groups.has(g))) return false;
    }
    if (venue && !servePara(venue, linha.venue)) return false;
    if (category && resolveTerm(linha.category ?? "", CATEGORIES, CATEGORY_SYNONYMS) !== category) {
      return false;
    }
    return termo === null || normalize(linha.name).includes(termo);
  });

  encontrados.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const mostrados = encontrados.slice(0, MAX_RESULTS);

  return {
    por_grupo: agruparPorMusculo(mostrados),
    ...soQuandoVaria(mostrados, "venue", "venue_por_exercicio"),
    ...soQuandoVaria(mostrados, "category", "category_por_exercicio"),
    total: encontrados.length,
    // Filtro que não casou com nada, num catálogo que tem linhas: é deriva de
    // dado, não catálogo vazio, e só o valor cru mostra isso.
    ...(encontrados.length === 0 && catalogo.length > 0
      ? { groupsInCatalog: [...new Set(catalogo.map((e) => e.muscle_group ?? "(sem grupo)"))] }
      : {}),
  };
}

/**
 * Quem treina em casa também faz o que serve nos dois lugares.
 *
 * Comparar por igualdade exata esvaziaria o treino sem academia: flexão e
 * prancha estão marcadas `ambos`, não `casa`.
 */
function servePara(pedido: Venue, doExercicio: string | null): boolean {
  const marcado = resolveTerm(doExercicio ?? "", VENUES, VENUE_SYNONYMS);
  if (!marcado) return false;
  if (pedido === "ambos") return marcado === "ambos";
  return marcado === pedido || marcado === "ambos";
}
