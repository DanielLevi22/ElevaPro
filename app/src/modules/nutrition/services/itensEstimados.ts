import type {
  AnaliseDoPrato,
  ComponenteDoPrato,
  ItemRegistrado,
  OrigemDoItem,
  SugestaoDoAssistente,
} from '@elevapro/shared';
import type { PratoComPorcoes } from './porcoesDoPrato';

/** O que o diálogo de registro recebe: o texto mostrado e os itens que entram. */
export interface PedidoDeRegistro {
  /** Como o item aparece no diálogo: "100 g de Banana", "Bowl, 380 kcal estimadas". */
  descricao: string;
  /** Um item, ou um por componente do prato do scan. */
  extras: Omit<ItemRegistrado, 'id'>[];
}

interface AlimentoEstimado {
  nome: string;
  gramas: number;
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
}

/**
 * Um alimento estimado por modelo como item do diário: a porção de referência
 * são as próprias gramas, e a origem vai sempre — o especialista precisa
 * distinguir estimativa do que foi prescrito (LGPD, Art. 6°, V).
 */
function itemEmGramas(alimento: AlimentoEstimado, origem: OrigemDoItem) {
  const { nome, gramas, calorias, proteina, carboidrato, gordura } = alimento;
  return {
    quantity: gramas,
    unit: 'g',
    food: {
      name: nome,
      serving_size: gramas,
      serving_unit: 'g',
      calories: calorias,
      protein: proteina,
      carbs: carboidrato,
      fat: gordura,
    },
    origem,
  };
}

/**
 * O prato do scan como pedido de registro. Com componentes, um item por
 * componente nas gramas ajustadas: o especialista lê "Quinoa 80 g", e não um
 * "Bowl" opaco. Sem componentes, o prato inteiro como uma porção — a foto não
 * diz gramas, e inventar 100 g daria ao número uma precisão que ele não tem.
 *
 * @example registro.pedir(pedidoDoPrato(analise, pratoComPorcoes(analise, gramas)));
 */
export function pedidoDoPrato(analise: AnaliseDoPrato, prato: PratoComPorcoes): PedidoDeRegistro {
  const descricao = `${analise.name}, ${Math.round(prato.macros.calorias)} kcal estimadas pela foto`;
  if (prato.componentes.length === 0) {
    const { name, calories, protein, carbs, fat } = analise;
    const food = { name, serving_size: 1, serving_unit: 'porção', calories, protein, carbs, fat };
    return { descricao, extras: [{ quantity: 1, unit: 'porção', food, origem: 'scan' }] };
  }
  const extras = prato.componentes
    .filter((componente) => componente.grams > 0)
    .map((componente) => itemEmGramas(alimentoDoComponente(componente), 'scan'));
  return { descricao, extras };
}

function alimentoDoComponente(componente: ComponenteDoPrato): AlimentoEstimado {
  const { name, grams, calories, protein, carbs, fat } = componente;
  return {
    nome: name,
    gramas: grams,
    calorias: calories,
    proteina: protein,
    carboidrato: carbs,
    gordura: fat,
  };
}

/**
 * A sugestão aceita no assistente como pedido de registro, item por item.
 *
 * @example registro.pedir(pedidoDaSugestao(sugestao), sugestao.refeicao);
 */
export function pedidoDaSugestao(sugestao: SugestaoDoAssistente): PedidoDeRegistro {
  return {
    descricao: sugestao.itens.map((item) => `${item.gramas} g de ${item.nome}`).join(', '),
    extras: sugestao.itens.map((item) => itemEmGramas(item, 'assistente')),
  };
}
