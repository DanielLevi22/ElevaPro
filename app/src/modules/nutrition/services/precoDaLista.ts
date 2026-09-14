import { fetchBff, lerRespostaBff } from '@/shared/bff';
import type { GrupoDeCompras } from './listaDeCompras';

interface CategoriaDoPreco {
  category: string;
  items: { name: string; quantity: string }[];
}

/**
 * A lista no formato da rota do assistente, só com nome e quantidade: a chave
 * do item é o id do Food e não ajuda a estimar (LGPD, Art. 6°, III).
 *
 * @example pedidoDoPreco(lista.grupos) // [{ category: 'Proteínas', items: [{ name, quantity }] }]
 */
export function pedidoDoPreco(grupos: GrupoDeCompras[]): CategoriaDoPreco[] {
  return grupos.map((grupo) => ({
    category: grupo.rotulo,
    items: grupo.itens.map((item) => ({ name: item.nome, quantity: item.quantidade })),
  }));
}

/**
 * "≈ R$ 284". O centavo daria à estimativa uma precisão que ela não tem, e o
 * "≈" fica sempre. Sem estimativa, `null`: a tela esconde o preço.
 *
 * @example textoDoPreco(1284.6) // '≈ R$ 1.285'
 */
export function textoDoPreco(total: number | null): string | null {
  if (total === null) return null;
  const reais = String(Math.round(total)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `≈ R$ ${reais}`;
}

/**
 * As estimativas já pedidas nesta sessão do app, pela lista exata que foi.
 * Voltar à tela ou alternar o período não chama a IA de novo pela mesma lista.
 */
const precosPedidos = new Map<string, Promise<number | null>>();

/**
 * O total estimado da lista, pedido ao assistente uma vez por lista. Falha dá
 * `null` e não fica guardada: a próxima vez na tela tenta de novo.
 *
 * @example const total = await estimarPrecoUmaVez(lista.grupos, token);
 */
export function estimarPrecoUmaVez(
  grupos: GrupoDeCompras[],
  token: string
): Promise<number | null> {
  const assinatura = JSON.stringify(pedidoDoPreco(grupos));
  const pedido =
    precosPedidos.get(assinatura) ??
    estimarPrecoDaLista(grupos, token).catch(() => {
      precosPedidos.delete(assinatura);
      return null;
    });
  precosPedidos.set(assinatura, pedido);
  return pedido;
}

/** O total estimado pelo assistente, ou `null` quando ele não soube dizer. */
async function estimarPrecoDaLista(
  grupos: GrupoDeCompras[],
  token: string
): Promise<number | null> {
  const { response, url } = await fetchBff(
    '/api/ai/nutrition/assistant',
    { categories: pedidoDoPreco(grupos), promptType: 'price' },
    { token }
  );
  const dados = await lerRespostaBff<{ precoEstimado?: number | null }>(response, url);
  if (!response.ok) {
    throw new Error(
      `price BFF error: status ${response.status}, esperado 2xx com { precoEstimado }`
    );
  }
  return dados.precoEstimado ?? null;
}
