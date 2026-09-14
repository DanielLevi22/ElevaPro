import { pedidoDaSugestao, pedidoDoPrato } from '../itensEstimados';

/**
 * A sugestão aceita no assistente vai ao diário pelo mesmo caminho do scan
 * (issue #298): um item por alimento, em gramas, com a origem da estimativa.
 */

const jantar = {
  refeicao: 'Jantar',
  itens: [
    { nome: 'Salmão', gramas: 160, calorias: 330, proteina: 32, carboidrato: 0, gordura: 21 },
    { nome: 'Batata doce', gramas: 200, calorias: 172, proteina: 3, carboidrato: 40, gordura: 0 },
  ],
};

describe('pedido da sugestão', () => {
  it('um item por alimento, com as gramas do modelo como porção de referência', () => {
    const { extras } = pedidoDaSugestao(jantar);

    expect(extras[0]).toEqual({
      quantity: 160,
      unit: 'g',
      food: {
        name: 'Salmão',
        serving_size: 160,
        serving_unit: 'g',
        calories: 330,
        protein: 32,
        carbs: 0,
        fat: 21,
      },
      origem: 'assistente',
    });
  });

  // Estimativa de modelo: o especialista precisa distinguir do prescrito (Art. 6°, V).
  it('todo item leva a origem assistente', () => {
    expect(pedidoDaSugestao(jantar).extras.map((e) => e.origem)).toEqual([
      'assistente',
      'assistente',
    ]);
  });

  it('descreve o que entra, em gramas', () => {
    expect(pedidoDaSugestao(jantar).descricao).toBe('160 g de Salmão, 200 g de Batata doce');
  });
});

describe('pedido do prato do scan', () => {
  const bowl = {
    name: 'Bowl',
    calories: 260,
    protein: 13,
    carbs: 32,
    fat: 12,
    confidence: 0.8,
    components: [],
  };

  it('um item por componente com gramas, com a origem scan', () => {
    const prato = {
      componentes: [
        { name: 'Quinoa', grams: 80, calories: 96, protein: 4, carbs: 17, fat: 2 },
        { name: 'Abacate', grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
      ],
      macros: { calorias: 96, proteina: 4, carboidrato: 17, gordura: 2 },
    };

    const { extras } = pedidoDoPrato(bowl, prato);

    // O componente zerado no "Ajustar porções" não entra.
    expect(extras).toHaveLength(1);
    expect(extras[0]).toMatchObject({ quantity: 80, unit: 'g', origem: 'scan' });
    expect(extras[0].food).toMatchObject({ name: 'Quinoa', serving_size: 80, calories: 96 });
  });

  it('sem componentes, o prato inteiro como uma porção', () => {
    const prato = {
      componentes: [],
      macros: { calorias: 260, proteina: 13, carboidrato: 32, gordura: 12 },
    };

    expect(pedidoDoPrato(bowl, prato).extras).toEqual([
      {
        quantity: 1,
        unit: 'porção',
        food: {
          name: 'Bowl',
          serving_size: 1,
          serving_unit: 'porção',
          calories: 260,
          protein: 13,
          carbs: 32,
          fat: 12,
        },
        origem: 'scan',
      },
    ]);
  });
});
