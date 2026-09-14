import type { DietMeal, DietMealItem, DietPlan, ItemRegistrado, MealLog } from '@elevapro/shared';

/** Calorias e macros em gramas, na unidade que as telas mostram. */
export interface Macros {
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
}

/**
 * Um item do prato como o aluno o comeu: o do plano, a troca ou o extra. O
 * formato de `meal_logs.actual_items` mora no `shared`, junto de quem grava.
 */
export type ItemDoPrato = ItemRegistrado;

export const MACROS_ZERADOS: Macros = { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 };

/** O `numeric` do Postgres chega como número ou texto, conforme o caminho. */
export function numeroDoBanco(valor: number | string | null | undefined): number {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

/**
 * Os itens que valem para a refeição: os registrados, se o aluno trocou ou
 * acrescentou algo, e os do plano quando não.
 *
 * @example itensDaRefeicao(logs[refeicao.id], itensDoPlano[refeicao.id])
 */
export function itensDaRefeicao(
  registro: MealLog | undefined,
  doPlano: DietMealItem[] | undefined
): ItemDoPrato[] {
  if (Array.isArray(registro?.actual_items)) return registro.actual_items as ItemDoPrato[];
  return doPlano ?? [];
}

/**
 * Calorias e macros de uma lista de itens, proporcionais à porção de referência.
 *
 * @example macrosDosItens(itensDaRefeicao(log, itens)).calorias
 */
export function macrosDosItens(itens: ItemDoPrato[]): Macros {
  return itens.reduce<Macros>((total, item) => {
    if (!item.food) return total;
    const fator = numeroDoBanco(item.quantity) / (numeroDoBanco(item.food.serving_size) || 100);
    return {
      calorias: total.calorias + numeroDoBanco(item.food.calories) * fator,
      proteina: total.proteina + numeroDoBanco(item.food.protein) * fator,
      carboidrato: total.carboidrato + numeroDoBanco(item.food.carbs) * fator,
      gordura: total.gordura + numeroDoBanco(item.food.fat) * fator,
    };
  }, MACROS_ZERADOS);
}

export function somarMacros(a: Macros, b: Macros): Macros {
  return {
    calorias: a.calorias + b.calorias,
    proteina: a.proteina + b.proteina,
    carboidrato: a.carboidrato + b.carboidrato,
    gordura: a.gordura + b.gordura,
  };
}

/**
 * O que o aluno comeu no dia.
 *
 * Refeição marcada soma o prato inteiro. Desmarcada soma só o item extra — o
 * que veio da busca, do scan ou do assistente: registrar já é dizer que comeu,
 * e o prato do plano, não.
 *
 * @example consumoDoDia(refeicoesDoDia(meals, tipo, dia), dailyLogs, mealItems)
 */
export function consumoDoDia(
  refeicoes: DietMeal[],
  registros: Record<string, MealLog>,
  itensDoPlano: Record<string, DietMealItem[]>
): Macros {
  return refeicoes
    .map((refeicao) => {
      const registro = registros[refeicao.id];
      const itens = itensDaRefeicao(registro, itensDoPlano[refeicao.id]);
      return macrosDosItens(registro?.completed ? itens : itens.filter((item) => item.origem));
    })
    .reduce(somarMacros, MACROS_ZERADOS);
}

/**
 * A meta do dia: a do plano, e o total prescrito para o dia quando o
 * especialista montou o plano refeição a refeição sem digitar meta.
 *
 * Cada macro cai para o prescrito sozinho — plano com meta só de calorias
 * ainda mostra os anéis de macro com número.
 *
 * @example metaDoDia(plano, refeicoesDoDia(meals, plano.plan_type, dia), mealItems)
 */
export function metaDoDia(
  plano: Pick<DietPlan, 'target_calories' | 'target_protein' | 'target_carbs' | 'target_fat'>,
  refeicoes: DietMeal[],
  itensDoPlano: Record<string, DietMealItem[]>
): Macros {
  const prescrito = refeicoes
    .map((refeicao) => macrosDosItens(itensDoPlano[refeicao.id] ?? []))
    .reduce(somarMacros, MACROS_ZERADOS);
  return {
    calorias: numeroDoBanco(plano.target_calories) || prescrito.calorias,
    proteina: numeroDoBanco(plano.target_protein) || prescrito.proteina,
    carboidrato: numeroDoBanco(plano.target_carbs) || prescrito.carboidrato,
    gordura: numeroDoBanco(plano.target_fat) || prescrito.gordura,
  };
}

/**
 * Quanto do total a parte representa, em inteiro. Passa de 100 de propósito:
 * comer além da meta é informação, e o anel já corta o traço sozinho.
 *
 * @example percentualDaMeta(1540, 2400) // 64
 */
export function percentualDaMeta(valor: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.max(0, Math.round((valor / meta) * 100));
}
