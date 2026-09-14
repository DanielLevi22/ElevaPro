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
 * O total estimado pelo assistente, ou `null` quando ele não soube dizer.
 *
 * @example const total = await estimarPrecoDaLista(lista.grupos, token);
 */
export async function estimarPrecoDaLista(
  grupos: GrupoDeCompras[],
  token: string
): Promise<number | null> {
  const { response, url } = await fetchBff(
    '/api/ai/nutrition/assistant',
    { categories: pedidoDoPreco(grupos), promptType: 'price' },
    { token }
  );
  const dados = await lerRespostaBff<{ precoEstimado?: number | null }>(response, url);
  if (!response.ok) throw new Error(`price BFF error: ${response.status}`);
  return dados.precoEstimado ?? null;
}
