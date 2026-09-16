import type { DietMeal, DietMealItem, DietPlanType } from '@elevapro/shared';
import { numeroDoBanco } from './consumoDoDia';

export interface ItemDeCompra {
  /** O id do Food, para a marcação de "comprado" sobreviver à regeração. */
  chave: string;
  nome: string;
  quantidade: string;
}

export interface GrupoDeCompras {
  rotulo: string;
  itens: ItemDeCompra[];
}

interface EntradaDaLista {
  tipoDoPlano: DietPlanType | null | undefined;
  refeicoes: DietMeal[];
  itensDoPlano: Record<string, DietMealItem[]>;
  dias: number;
}

/** A categoria do catálogo no grupo do kit. Fruta e hortaliça viram Hortifrúti. */
const GRUPO_DA_CATEGORIA: Record<string, string> = {
  proteina: 'Proteínas',
  carboidrato: 'Carboidratos',
  fruta: 'Hortifrúti',
  hortalica: 'Hortifrúti',
  laticinio: 'Laticínios',
  leguminosa: 'Grãos',
  gordura: 'Gorduras',
  bebida: 'Bebidas',
  suplemento: 'Suplementos',
};

const ORDEM_DOS_GRUPOS = [
  'Proteínas',
  'Carboidratos',
  'Hortifrúti',
  'Laticínios',
  'Grãos',
  'Gorduras',
  'Bebidas',
  'Suplementos',
  'Outros',
];

const DIAS_DA_SEMANA = 7;

interface Soma {
  nome: string;
  unidade: string;
  total: number;
  grupo: string;
}

/**
 * O que comprar para o plano no período, somado por alimento e agrupado pela
 * categoria do catálogo.
 *
 * O plano único guarda um dia que se repete; o cíclico guarda a semana, que
 * vale sete dias. A tela antiga multiplicava a semana inteira pelo período, e
 * a lista de sete dias comprava 49.
 *
 * @example
 * listaDeCompras({ tipoDoPlano: plano.plan_type, refeicoes: meals, itensDoPlano: mealItems, dias: 7 })
 */
export function listaDeCompras({
  tipoDoPlano,
  refeicoes,
  itensDoPlano,
  dias,
}: EntradaDaLista): GrupoDeCompras[] {
  // Mesma leitura do `mealsOfDay`: só 'unique' é dia que se repete. Plano
  // sem tipo, com refeições por dia, é semana — tratá-lo como único voltava a
  // comprar sete vezes mais.
  const fator = tipoDoPlano === 'unique' ? dias : dias / DIAS_DA_SEMANA;
  const somas = somarPorAlimento(refeicoes, itensDoPlano, fator);

  return ORDEM_DOS_GRUPOS.map((rotulo) => ({
    rotulo,
    itens: [...somas.entries()]
      .filter(([, soma]) => soma.grupo === rotulo)
      .map(([chave, soma]) => ({
        chave,
        nome: soma.nome,
        quantidade: quantidadeLegivel(soma.total, soma.unidade),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  })).filter((grupo) => grupo.itens.length > 0);
}

function somarPorAlimento(
  refeicoes: DietMeal[],
  itensDoPlano: Record<string, DietMealItem[]>,
  fator: number
): Map<string, Soma> {
  const somas = new Map<string, Soma>();
  for (const item of refeicoes.flatMap((refeicao) => itensDoPlano[refeicao.id] ?? [])) {
    if (!item.food) continue;
    const chave = item.food.id ?? item.food.name;
    const atual = somas.get(chave) ?? {
      nome: item.food.name,
      unidade: item.unit,
      total: 0,
      grupo: GRUPO_DA_CATEGORIA[item.food.category ?? ''] ?? 'Outros',
    };
    somas.set(chave, { ...atual, total: atual.total + numeroDoBanco(item.quantity) * fator });
  }
  return somas;
}

/** Com vírgula decimal e uma casa: "1,4". */
function umaCasa(valor: number): string {
  return (Math.round(valor * 10) / 10).toString().replace('.', ',');
}

/**
 * "1,4 kg", "860 g", "2,1 L", "11 un". Peso e volume passam de unidade a partir
 * de mil; abaixo disso arredondam a 10, que é a precisão de uma balança de
 * mercado. O que se conta em unidade arredonda para cima: não se compra meio ovo.
 */
function quantidadeLegivel(total: number, unidade: string): string {
  const base = unidade.toLowerCase();
  if (base === 'g' || base === 'ml') {
    const maior = base === 'g' ? 'kg' : 'L';
    if (total >= 1000) return `${umaCasa(total / 1000)} ${maior}`;
    return `${Math.round(total / 10) * 10} ${base}`;
  }
  // Arredonda antes de subir: 0,1 × 30 dá 3,0000000000000004, e o teto seria 4 por ruído.
  return `${Math.ceil(Math.round(total * 1000) / 1000)} ${unidade}`;
}
