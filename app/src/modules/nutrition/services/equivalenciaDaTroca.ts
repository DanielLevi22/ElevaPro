import type { Food } from '@elevapro/shared';
import { type ItemDoPrato, macrosDosItens, numeroDoBanco } from './consumoDoDia';

/** Um alimento que pode entrar no lugar do item, na quantidade que o equivale. */
export interface Equivalente {
  food: Food;
  /** Na unidade de referência do Food, arredondada a 5. */
  quantidade: number;
  /** Com sinal: o que a troca tira ou acrescenta, já depois do arredondamento. */
  diferencaCalorias: number;
  diferencaProteina: number;
}

export type OrdemDosEquivalentes = 'calorias' | 'proteina';

/** A balança de cozinha pesa de 5 em 5; "279 g" é precisão que ninguém mede. */
const PASSO_DA_QUANTIDADE = 5;

/**
 * Acima disso a troca vira outra refeição: 180 g de frango pedem quase 2 kg de
 * brócolis para dar a mesma proteína.
 */
const LIMITE_SOBRE_O_ORIGINAL = 3;

/**
 * Os Foods que substituem o item mantendo a meta de proteína do dia.
 *
 * A quantidade iguala a proteína do item que sai. Item sem proteína — arroz,
 * azeite — é igualado por calorias, e aí só entra candidato com calorias.
 *
 * @example
 * const lista = equivalentesDaTroca(itemDoFrango, resultadoDaBusca);
 */
export function equivalentesDaTroca(original: ItemDoPrato, candidatos: Food[]): Equivalente[] {
  const alvo = macrosDosItens([original]);
  const pelaProteina = alvo.proteina > 0;
  const quantidadeOriginal = numeroDoBanco(original.quantity);

  return candidatos.flatMap((food) => {
    if (food.id === original.food?.id) return [];
    const porGrama =
      (pelaProteina ? numeroDoBanco(food.protein) : numeroDoBanco(food.calories)) /
      (numeroDoBanco(food.serving_size) || 100);
    if (porGrama <= 0) return [];

    const alvoDoMacro = pelaProteina ? alvo.proteina : alvo.calorias;
    const quantidade =
      Math.round(alvoDoMacro / porGrama / PASSO_DA_QUANTIDADE) * PASSO_DA_QUANTIDADE;
    if (quantidade <= 0 || quantidade > quantidadeOriginal * LIMITE_SOBRE_O_ORIGINAL) return [];

    const novo = macrosDosItens([{ id: food.id, quantity: quantidade, food }]);
    return [
      {
        food,
        quantidade,
        diferencaCalorias: inteiroSemSinalNegativoDeZero(novo.calorias - alvo.calorias),
        diferencaProteina: inteiroSemSinalNegativoDeZero(novo.proteina - alvo.proteina),
      },
    ];
  });
}

/** `Math.round(-0,2)` é `-0`, e a tela escreveria "−0 g". */
function inteiroSemSinalNegativoDeZero(valor: number): number {
  return Math.round(valor) || 0;
}

/** Proteína por caloria: o que distingue equivalentes que já têm a mesma proteína. */
export function densidadeDeProteina(food: Food): number {
  const calorias = numeroDoBanco(food.calories);
  return calorias > 0 ? numeroDoBanco(food.protein) / calorias : 0;
}

/**
 * A ordem da lista: o mais perto em calorias, ou o mais magro primeiro.
 *
 * @example ordenarEquivalentes(lista, 'proteina')
 */
export function ordenarEquivalentes(
  lista: Equivalente[],
  ordem: OrdemDosEquivalentes
): Equivalente[] {
  const comparar =
    ordem === 'calorias'
      ? (a: Equivalente, b: Equivalente) =>
          Math.abs(a.diferencaCalorias) - Math.abs(b.diferencaCalorias)
      : (a: Equivalente, b: Equivalente) =>
          densidadeDeProteina(b.food) - densidadeDeProteina(a.food);
  return [...lista].sort(comparar);
}
