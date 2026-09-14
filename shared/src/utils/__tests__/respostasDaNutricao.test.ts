import { describe, expect, it } from "vitest";
import {
  lerAnaliseDoPrato,
  lerPrecoEstimado,
  lerSugestoesDeRefeicao,
  separarSugestaoDaResposta,
} from "../respostasDaNutricao";

/**
 * O texto do modelo virando dado que a tela confia.
 *
 * O modelo é a fronteira menos confiável do sistema: embrulha JSON em cerca de
 * markdown, esquece campo, manda número como texto. O que sai daqui ou é dado
 * válido, ou é `null` — nunca meio objeto que a tela desenha como se fosse
 * certo.
 */

describe("análise do prato", () => {
  // O contrato de antes: prato inteiro, sem componentes. O app velho e a rota
  // nova precisam continuar se entendendo (issue #298, compatibilidade).
  it("lê a resposta antiga, sem componentes", () => {
    const analise = lerAnaliseDoPrato(
      '{"name":"Arroz","calories":130,"protein":2.7,"carbs":28,"fat":0.3,"confidence":0.9}',
    );

    expect(analise).toEqual({
      name: "Arroz",
      calories: 130,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      confidence: 0.9,
      components: [],
    });
  });

  it("lê os componentes com gramas e macros, dentro da cerca de markdown", () => {
    const analise = lerAnaliseDoPrato(
      '```json\n{"name":"Bowl","calories":260,"protein":20,"carbs":30,"fat":6,"confidence":0.8,' +
        '"components":[{"name":"Grão-de-bico","grams":120,"calories":164,"protein":9,"carbs":27,"fat":3}]}\n```',
    );

    expect(analise?.components).toEqual([
      { name: "Grão-de-bico", grams: 120, calories: 164, protein: 9, carbs: 27, fat: 3 },
    ]);
  });

  // Um componente sem gramas não dá para ajustar nem somar: sai da lista, e o
  // prato continua valendo pelo total.
  it("descarta componente incompleto e mantém os válidos", () => {
    const analise = lerAnaliseDoPrato(
      '{"name":"Bowl","calories":260,"protein":20,"carbs":30,"fat":6,"confidence":0.8,' +
        '"components":[{"name":"Quinoa","calories":96},{"name":"Abacate","grams":60,"calories":96,"protein":1,"carbs":5,"fat":9}]}',
    );

    expect(analise?.components.map((c) => c.name)).toEqual(["Abacate"]);
  });

  it("confiança fora de 0 a 1 é cortada na faixa", () => {
    const analise = lerAnaliseDoPrato(
      '{"name":"Arroz","calories":130,"protein":2,"carbs":28,"fat":0,"confidence":1.7}',
    );

    expect(analise?.confidence).toBe(1);
  });

  it("sem nome ou sem calorias, não há análise", () => {
    expect(lerAnaliseDoPrato('{"calories":130}')).toBeNull();
    expect(lerAnaliseDoPrato("não consegui identificar")).toBeNull();
  });
});

describe("sugestão estruturada na resposta do assistente", () => {
  it("separa o bloco de sugestão do texto que o aluno lê", () => {
    const { resposta, sugestao } = separarSugestaoDaResposta(
      'Salmão com batata doce fecha a meta.\n<sugestao>{"refeicao":"Jantar","itens":[' +
        '{"nome":"Salmão","gramas":160,"calorias":330,"proteina":32,"carboidrato":0,"gordura":21}]}</sugestao>',
    );

    expect(resposta).toBe("Salmão com batata doce fecha a meta.");
    expect(sugestao).toEqual({
      refeicao: "Jantar",
      itens: [
        { nome: "Salmão", gramas: 160, calorias: 330, proteina: 32, carboidrato: 0, gordura: 21 },
      ],
    });
  });

  // A maioria das respostas não sugere nada aplicável: sem bloco, sem cartão.
  it("resposta sem bloco não tem sugestão", () => {
    expect(separarSugestaoDaResposta("Beba água ao longo do dia.")).toEqual({
      resposta: "Beba água ao longo do dia.",
      sugestao: null,
    });
  });

  // Bloco quebrado some do texto — o aluno não pode ler JSON cru no balão —, e
  // o cartão não aparece.
  it("bloco ilegível sai do texto e não vira sugestão", () => {
    expect(separarSugestaoDaResposta("Tente isto.<sugestao>{quebrado</sugestao>")).toEqual({
      resposta: "Tente isto.",
      sugestao: null,
    });
  });

  it("sugestão sem item válido não vira cartão", () => {
    const { sugestao } = separarSugestaoDaResposta(
      '<sugestao>{"refeicao":"Jantar","itens":[{"nome":"Salmão"}]}</sugestao>',
    );

    expect(sugestao).toBeNull();
  });
});

describe("sugestões de refeição da busca", () => {
  it("lê até duas sugestões com nome, kcal, minutos e destaque", () => {
    const sugestoes = lerSugestoesDeRefeicao(
      '[{"nome":"Salada de frango","calorias":320,"minutos":20,"destaque":"Alta proteína"},' +
        '{"nome":"Bowl de abacate","calorias":280,"minutos":15,"destaque":"Low carb"},' +
        '{"nome":"Terceira","calorias":100,"minutos":5,"destaque":"x"}]',
    );

    expect(sugestoes).toHaveLength(2);
    expect(sugestoes[0]).toEqual({
      nome: "Salada de frango",
      calorias: 320,
      minutos: 20,
      destaque: "Alta proteína",
    });
  });

  it("resposta ilegível dá lista vazia, e a seção some", () => {
    expect(lerSugestoesDeRefeicao("desculpe")).toEqual([]);
  });
});

describe("preço estimado da lista", () => {
  it("lê o total em reais", () => {
    expect(lerPrecoEstimado('{"total": 284.5}')).toBe(284.5);
  });

  // Preço zero ou negativo é estimativa quebrada: melhor não mostrar "≈ R$ 0".
  it("total ausente, zero ou negativo não é estimativa", () => {
    expect(lerPrecoEstimado('{"total": 0}')).toBeNull();
    expect(lerPrecoEstimado("não sei")).toBeNull();
  });
});
