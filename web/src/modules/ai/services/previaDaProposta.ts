import { lerJsonParcial } from "./jsonParcial";

/**
 * O que já dá para mostrar de uma proposta que ainda está sendo escrita.
 *
 * O modelo leva de 15 a 20 segundos montando o JSON, e este módulo transforma o
 * pedaço que já chegou em linhas para a tela — a fase, depois o Treino A,
 * depois cada exercício. Não é o cartão: é a espera deixando de ser opaca.
 *
 * Nada aparece pela metade. Um treino sem título ainda não é um treino, e uma
 * série sem repetição não vira "3×" na tela — some até completar.
 */
export interface LinhaDaPrevia {
  texto: string;
  /** À direita, em tom mais fraco: séries, quantidade, duração. */
  detalhe?: string;
  /** 0 é item do primeiro nível (treino, refeição, fase); 1 é o que vai dentro. */
  nivel: 0 | 1;
}

export interface Previa {
  titulo: string;
  linhas: LinhaDaPrevia[];
}

type Obj = Record<string, unknown>;

const TITULO_PADRAO: Record<string, string> = {
  propose_periodization: "Periodização",
  propose_workouts: "Treinos",
  propose_diet_plan: "Plano alimentar",
  propose_meals: "Refeições",
};

function objeto(valor: unknown): Obj | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Obj)
    : null;
}

function texto(o: Obj, chave: string): string | undefined {
  const valor = o[chave];
  return typeof valor === "string" && valor.trim().length > 0 ? valor : undefined;
}

function numero(o: Obj, chave: string): number | undefined {
  const valor = o[chave];
  return typeof valor === "number" && Number.isFinite(valor) ? valor : undefined;
}

function lista(o: Obj, chave: string): Obj[] {
  const valor = o[chave];
  if (!Array.isArray(valor)) return [];
  return valor.map(objeto).filter((item): item is Obj => item !== null);
}

interface Rascunho {
  titulo?: string;
  linhas: LinhaDaPrevia[];
}

function daPeriodizacao(raiz: Obj): Rascunho {
  const linhas = lista(raiz, "phases").flatMap((fase) => {
    const nome = texto(fase, "name");
    if (!nome) return [];
    const semanas = numero(fase, "weeks");
    return [
      {
        nivel: 0 as const,
        texto: nome,
        detalhe: semanas === undefined ? texto(fase, "focus") : `${semanas} sem`,
      },
    ];
  });

  return { titulo: texto(raiz, "name"), linhas };
}

function dosTreinos(raiz: Obj): Rascunho {
  const linhas: LinhaDaPrevia[] = [];

  for (const treino of lista(raiz, "workouts")) {
    const titulo = texto(treino, "title");
    if (!titulo) continue;
    linhas.push({ nivel: 0, texto: titulo });

    for (const exercicio of lista(treino, "exercises")) {
      const nome = texto(exercicio, "exercise_name");
      if (!nome) continue;
      const series = numero(exercicio, "sets");
      const reps = texto(exercicio, "reps");
      linhas.push({
        nivel: 1,
        texto: nome,
        detalhe: series !== undefined && reps !== undefined ? `${series}×${reps}` : undefined,
      });
    }
  }

  const fase = texto(raiz, "phase_name");
  return { titulo: fase && `Treinos · ${fase}`, linhas };
}

/** As metas do plano, na ordem em que o especialista as lê no cartão. */
const METAS: Array<[chave: string, unidade: string]> = [
  ["target_calories", "kcal"],
  ["target_protein", "g de proteína"],
  ["target_carbs", "g de carboidrato"],
  ["target_fat", "g de gordura"],
];

function doPlanoAlimentar(raiz: Obj): Rascunho {
  const semanas = numero(raiz, "duration_weeks");
  const linhas: LinhaDaPrevia[] =
    semanas === undefined ? [] : [{ nivel: 0, texto: `${semanas} semanas` }];

  for (const [chave, unidade] of METAS) {
    const valor = numero(raiz, chave);
    if (valor !== undefined) linhas.push({ nivel: 0, texto: `${valor} ${unidade}` });
  }

  return { titulo: texto(raiz, "name"), linhas };
}

function dasRefeicoes(raiz: Obj): Rascunho {
  const linhas: LinhaDaPrevia[] = [];

  for (const refeicao of lista(raiz, "meals")) {
    const nome = texto(refeicao, "name");
    if (!nome) continue;
    linhas.push({ nivel: 0, texto: nome, detalhe: texto(refeicao, "meal_time") });

    for (const item of lista(refeicao, "items")) {
      const alimento = texto(item, "food_name");
      if (!alimento) continue;
      const quantidade = numero(item, "quantity");
      const unidade = texto(item, "unit");
      linhas.push({
        nivel: 1,
        texto: alimento,
        detalhe:
          quantidade !== undefined && unidade !== undefined
            ? `${quantidade} ${unidade}`
            : undefined,
      });
    }
  }

  return { linhas };
}

const RASCUNHOS: Record<string, (raiz: Obj) => Rascunho> = {
  propose_periodization: daPeriodizacao,
  propose_workouts: dosTreinos,
  propose_diet_plan: doPlanoAlimentar,
  propose_meals: dasRefeicoes,
};

/**
 * Lê o JSON incompleto da ferramenta e devolve o que a tela pode mostrar.
 *
 * `null` enquanto não há nada de que falar — nem nome, nem um item inteiro.
 * Quem chama trata como "ainda não".
 *
 * @example
 * resumoDaPrevia("propose_workouts", '{"phase_name":"Base","workouts":[{"title":"Treino A"')
 * // { titulo: "Treinos · Base", linhas: [{ nivel: 0, texto: "Treino A" }] }
 */
export function resumoDaPrevia(tool: string, cru: string): Previa | null {
  const monta = RASCUNHOS[tool];
  if (!monta) return null;

  const raiz = objeto(lerJsonParcial(cru));
  if (!raiz) return null;

  const { titulo, linhas } = monta(raiz);
  if (!titulo && linhas.length === 0) return null;

  return { titulo: titulo ?? TITULO_PADRAO[tool], linhas };
}
