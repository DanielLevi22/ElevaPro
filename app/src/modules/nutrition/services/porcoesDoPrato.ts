import type { AnaliseDoPrato, ComponenteDoPrato } from '@elevapro/shared';
import { MACROS_ZERADOS, type Macros, somarMacros } from './consumoDoDia';

export interface PratoComPorcoes {
  componentes: ComponenteDoPrato[];
  macros: Macros;
}

/** Uma casa: a proporção de um número estimado não merece mais precisão que isso. */
function umaCasa(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/** O componente em outras gramas, com os macros na mesma proporção. */
function componenteNasGramas(componente: ComponenteDoPrato, gramas: number): ComponenteDoPrato {
  const novas = Math.max(0, gramas);
  const fator = componente.grams > 0 ? novas / componente.grams : 0;
  return {
    name: componente.name,
    grams: novas,
    calories: umaCasa(componente.calories * fator),
    protein: umaCasa(componente.protein * fator),
    carbs: umaCasa(componente.carbs * fator),
    fat: umaCasa(componente.fat * fator),
  };
}

function macrosDoComponente(componente: ComponenteDoPrato): Macros {
  return {
    calorias: componente.calories,
    proteina: componente.protein,
    carboidrato: componente.carbs,
    gordura: componente.fat,
  };
}

/**
 * O prato do scan com as gramas que o aluno ajustou, componente a componente,
 * e os macros do prato somados de novo.
 *
 * Sem componentes — a resposta antiga do scan —, não há o que ajustar e o prato
 * vale pelos totais do modelo.
 *
 * @example pratoComPorcoes(analise, { 1: 120 }).macros.calorias
 */
export function pratoComPorcoes(
  analise: AnaliseDoPrato,
  gramas: Record<number, number>
): PratoComPorcoes {
  if (analise.components.length === 0) {
    return {
      componentes: [],
      macros: {
        calorias: analise.calories,
        proteina: analise.protein,
        carboidrato: analise.carbs,
        gordura: analise.fat,
      },
    };
  }
  const componentes = analise.components.map((componente, indice) =>
    componenteNasGramas(componente, gramas[indice] ?? componente.grams)
  );
  return {
    componentes,
    macros: componentes.map(macrosDoComponente).reduce(somarMacros, MACROS_ZERADOS),
  };
}
