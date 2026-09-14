import * as bff from '@/shared/bff';
import { estimarPrecoUmaVez, pedidoDoPreco, textoDoPreco } from '../precoDaLista';

// A rede é a fronteira: o que se confere é quantas vezes a lista sai do aparelho.
jest.mock('@/shared/bff', () => ({ fetchBff: jest.fn(), lerRespostaBff: jest.fn() }));

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

describe('estimar o preço uma vez por lista', () => {
  const fetchBff = jest.mocked(bff.fetchBff);
  const lerRespostaBff = jest.mocked(bff.lerRespostaBff);

  function respostaDaRota(ok: boolean, precoEstimado: number | null) {
    fetchBff.mockResolvedValueOnce({
      response: { ok, status: ok ? 200 : 503 } as Response,
      url: '',
    });
    lerRespostaBff.mockResolvedValueOnce({ precoEstimado });
  }

  beforeEach(() => jest.clearAllMocks());

  // Voltar à tela ou alternar o período não chama a IA de novo pela mesma lista.
  it('a mesma lista pede ao assistente uma vez só', async () => {
    const lista = [
      { rotulo: 'Grãos', itens: [{ chave: 'f9', nome: 'Feijão', quantidade: '1 kg' }] },
    ];
    respostaDaRota(true, 12);

    expect(await estimarPrecoUmaVez(lista, 'token')).toBe(12);
    expect(await estimarPrecoUmaVez(lista, 'token')).toBe(12);
    expect(fetchBff).toHaveBeenCalledTimes(1);
  });

  it('a falha não fica guardada: o próximo pedido tenta de novo', async () => {
    const lista = [
      { rotulo: 'Grãos', itens: [{ chave: 'f8', nome: 'Lentilha', quantidade: '500 g' }] },
    ];
    respostaDaRota(false, null);
    respostaDaRota(true, 9);

    expect(await estimarPrecoUmaVez(lista, 'token')).toBeNull();
    expect(await estimarPrecoUmaVez(lista, 'token')).toBe(9);
  });
});
