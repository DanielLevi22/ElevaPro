/**
 * Os contratos das rotas de IA do fluxo de nutrição do aluno (issue #298).
 *
 * Todo campo novo é opcional na ida e na volta: o app antigo continua falando
 * com a rota nova, e o app novo desenha a tela sem o bloco quando a resposta
 * não o traz.
 */

/** Um componente do prato reconhecido na foto, com as gramas estimadas. */
export interface ComponenteDoPrato {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** O que `/api/ai/student/scan-food` devolve. */
export interface AnaliseDoPrato {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** De 0 a 1. */
  confidence: number;
  /** Vazio quando o modelo não separou o prato — o contrato antigo. */
  components: ComponenteDoPrato[];
}

/** Um item da sugestão aplicável do assistente. */
export interface ItemSugerido {
  nome: string;
  gramas: number;
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
}

/** A sugestão que vira o cartão "Adicionar ao jantar". */
export interface SugestaoDoAssistente {
  /** O nome da refeição do plano, como o modelo a escreveu. */
  refeicao: string;
  itens: ItemSugerido[];
}

/** Um cartão de "Sugestões do assistente" na busca. */
export interface SugestaoDeRefeicao {
  nome: string;
  calorias: number;
  minutos: number;
  destaque: string;
}
