import type { DietMeal, DietMealItem, Food } from '@elevapro/shared';
import { listaDeCompras } from '../listaDeCompras';

/**
 * A lista de compras do kit: o que o plano manda comer no período, somado por
 * alimento e agrupado pela categoria do catálogo.
 */

function alimento(id: string, category: string | null, name = id): Food {
  return { id, name, category, serving_size: 100, serving_unit: 'g' } as Food;
}

function refeicao(id: string, dia: number | null): DietMeal {
  return { id, name: id, day_of_week: dia } as DietMeal;
}

function item(food: Food, quantity: number, unit = 'g'): DietMealItem {
  return { id: `${food.id}-${quantity}`, food, quantity, unit } as DietMealItem;
}

const frango = alimento('frango', 'proteina', 'Peito de frango');
const arroz = alimento('arroz', 'carboidrato', 'Arroz integral');
const banana = alimento('banana', 'fruta', 'Banana');
const ovo = { ...alimento('ovo', 'proteina', 'Ovos'), serving_unit: 'un' } as Food;

describe('lista de compras', () => {
  it('no plano único, o dia se repete pelo período', () => {
    const lista = listaDeCompras({
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('almoco', null), refeicao('jantar', null)],
      itensDoPlano: { almoco: [item(frango, 100)], jantar: [item(frango, 100)] },
      dias: 7,
    });

    expect(lista[0].itens).toEqual([
      { chave: 'frango', nome: 'Peito de frango', quantidade: '1,4 kg' },
    ]);
  });

  // O defeito da tela antiga: somava as refeições dos sete dias e ainda
  // multiplicava pelo período, e a lista de 7 dias comprava 49 dias de comida.
  it('no plano cíclico, a semana inteira vale sete dias, e não um', () => {
    const semana = Array.from({ length: 7 }, (_, dia) => refeicao(`almoco-${dia}`, dia));
    const itens = Object.fromEntries(semana.map((r) => [r.id, [item(frango, 200)]]));

    const lista = listaDeCompras({
      tipoDoPlano: 'cyclic',
      refeicoes: semana,
      itensDoPlano: itens,
      dias: 14,
    });

    expect(lista[0].itens[0].quantidade).toBe('2,8 kg');
  });

  it('agrupa pela categoria do catálogo, na ordem do kit', () => {
    const lista = listaDeCompras({
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('almoco', null)],
      itensDoPlano: { almoco: [item(banana, 120), item(arroz, 150), item(frango, 180)] },
      dias: 7,
    });

    expect(lista.map((grupo) => grupo.rotulo)).toEqual(['Proteínas', 'Carboidratos', 'Hortifrúti']);
  });

  it('abaixo de 1 kg, fica em gramas arredondados a 10', () => {
    const lista = listaDeCompras({
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('lanche', null)],
      itensDoPlano: { lanche: [item(banana, 123)] },
      dias: 7,
    });

    expect(lista[0].itens[0].quantidade).toBe('860 g');
  });

  it('unidade que não é peso nem volume não converte, e arredonda para cima', () => {
    const lista = listaDeCompras({
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('cafe', null)],
      itensDoPlano: { cafe: [item(ovo, 1.5, 'un')] },
      dias: 7,
    });

    expect(lista[0].itens[0].quantidade).toBe('11 un');
  });

  it('alimento sem categoria vai para "Outros", no fim', () => {
    const semCategoria = alimento('whey', null, 'Whey');
    const lista = listaDeCompras({
      tipoDoPlano: 'unique',
      refeicoes: [refeicao('cafe', null)],
      itensDoPlano: { cafe: [item(semCategoria, 30), item(frango, 100)] },
      dias: 7,
    });

    expect(lista.map((grupo) => grupo.rotulo)).toEqual(['Proteínas', 'Outros']);
  });

  it('plano sem itens dá lista vazia', () => {
    expect(
      listaDeCompras({ tipoDoPlano: 'unique', refeicoes: [], itensDoPlano: {}, dias: 7 })
    ).toEqual([]);
  });
});
