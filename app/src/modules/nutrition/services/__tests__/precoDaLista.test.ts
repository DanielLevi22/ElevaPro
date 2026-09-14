import { pedidoDoPreco, textoDoPreco } from '../precoDaLista';

/**
 * O preço estimado da lista de compras (issue #298): ao assistente vão só o
 * nome e a quantidade de cada item, e a tela mostra sempre com "≈".
 */

const grupos = [
  {
    rotulo: 'Proteínas',
    itens: [
      { chave: 'food-1', nome: 'Peito de frango', quantidade: '1,4 kg' },
      { chave: 'food-2', nome: 'Ovos', quantidade: '30 un' },
    ],
  },
  { rotulo: 'Hortifrúti', itens: [{ chave: 'food-3', nome: 'Banana', quantidade: '12 un' }] },
];

describe('pedido do preço', () => {
  // A chave é o id do Food: não diz nada ao preço, e não sai do aparelho.
  it('leva só nome e quantidade, agrupados', () => {
    expect(pedidoDoPreco(grupos)).toEqual([
      {
        category: 'Proteínas',
        items: [
          { name: 'Peito de frango', quantity: '1,4 kg' },
          { name: 'Ovos', quantity: '30 un' },
        ],
      },
      { category: 'Hortifrúti', items: [{ name: 'Banana', quantity: '12 un' }] },
    ]);
  });
});

describe('texto do preço', () => {
  it('em reais inteiros, com "≈" e o ponto do milhar', () => {
    expect(textoDoPreco(284.4)).toBe('≈ R$ 284');
    expect(textoDoPreco(1284.6)).toBe('≈ R$ 1.285');
  });

  // Sem estimativa, o preço some — nunca "R$ 0".
  it('sem estimativa, não há texto', () => {
    expect(textoDoPreco(null)).toBeNull();
  });
});
