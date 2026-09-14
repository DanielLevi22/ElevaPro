import { describe, expect, it } from "vitest";
import {
  achatarRespostas,
  declaresContinuousMedication,
  filtrarEntradaNumerica,
  lerRespostaNumerica,
  lerRespostaTexto,
} from "../anamnese";

describe("leitura de resposta numérica da anamnese", () => {
  // A mesma pergunta produz formas diferentes no banco conforme a plataforma em
  // que o aluno respondeu: o web converte antes de gravar, o mobile grava o
  // texto cru do campo. Quem lê não pode depender de qual aparelho ele usou.
  it("lê como número o que o mobile gravou como texto", () => {
    expect(lerRespostaNumerica("175", "height")).toEqual({ ok: true, valor: 175 });
  });
});

describe("vírgula como separador decimal", () => {
  // O teclado numérico do Android tem vírgula, e o campo do mobile devolve o
  // que foi digitado sem tocar. `Number("75,5")` é NaN: sem esta conversão o
  // peso do aluno vira ausente por causa da tecla que ele tinha à mão.
  it("aceita a vírgula que o teclado do aparelho oferece", () => {
    expect(lerRespostaNumerica("75,5", "weight")).toEqual({ ok: true, valor: 75.5 });
  });
});

describe("altura digitada em metros", () => {
  // A pergunta diz "Altura (cm)" no web e "Qual é a sua altura?" no mobile, e
  // parte dos alunos responde em metro de qualquer jeito. 1,75 não é uma altura
  // implausível — é a mesma altura na outra unidade, e recusá-la mandaria o
  // aluno corrigir um valor que ele digitou certo.
  it("entende 1,75 como 175 cm", () => {
    expect(lerRespostaNumerica("1,75", "height")).toEqual({ ok: true, valor: 175 });
  });

  // 1.83 * 100 é 183.00000000000003 em ponto flutuante. Sem arredondar, a
  // altura do aluno chega ao prompt da análise com quinze casas decimais.
  it("não deixa o ponto flutuante vazar na conversão", () => {
    expect(lerRespostaNumerica("1,83", "height")).toEqual({ ok: true, valor: 183 });
  });

  // O peso não tem essa ambiguidade: 1,75 kg é implausível, não é outra unidade.
  // Converter aqui inventaria 175 kg a partir de um erro de digitação.
  it("não aplica a conversão ao peso", () => {
    expect(lerRespostaNumerica("1,75", "weight")).not.toEqual({ ok: true, valor: 175 });
  });
});

describe("recusa nomeada", () => {
  // Recusar é um resultado, não uma exceção engolida: quem chama precisa saber
  // se o aluno nunca respondeu, se respondeu algo que não é número, ou se o
  // número é implausível — porque a ação é diferente em cada caso, e "ausente"
  // para os três faria a tela mandar responder de novo quem já respondeu.
  const casos: [string, string, unknown][] = [
    ["nunca respondida", "ausente", undefined],
    ["respondida em branco", "ausente", ""],
    ["respondida por extenso", "nao_numerico", "cento e setenta"],
    ["implausível para altura", "fora_de_faixa", "300"],
  ];

  it.each(casos)("%s é recusada como %s", (_titulo, motivo, bruto) => {
    expect(lerRespostaNumerica(bruto, "height")).toEqual({ ok: false, motivo });
  });
});

describe("resposta embrulhada pelo mobile", () => {
  // A mesma coluna guarda duas formas: o web grava `{ height: 175 }` e o mobile
  // grava `{ height: { questionId: "height", value: 175 } }`. Quem lê sem
  // desembrulhar recebe o objeto no lugar do valor — e como `Number({...})` é
  // NaN, a resposta de quem respondeu pelo celular vira "não numérica".
  it("desembrulha o valor que o mobile guarda dentro de um objeto", () => {
    expect(lerRespostaNumerica({ questionId: "height", value: 175 }, "height")).toEqual({
      ok: true,
      valor: 175,
    });
  });

  // O embrulho do mobile carrega o mesmo texto cru de antes da correção da #180,
  // então desembrulhar sem converter só troca um defeito por outro.
  it("converte o texto que vem dentro do embrulho", () => {
    expect(lerRespostaNumerica({ questionId: "height", value: "1,75" }, "height")).toEqual({
      ok: true,
      valor: 175,
    });
  });
});

describe("leitura de resposta em texto", () => {
  // É este o caminho de `injuries` e `health_conditions`, os dois campos que o
  // carregador de contexto entrega ao modelo que prescreve. Lido sem
  // desembrulhar, `String({questionId, value})` produz "[object Object]" — que
  // não é vazio, atravessa a checagem de "respondeu?" e chega ao prompt como se
  // fosse o histórico de lesão do aluno.
  it("desembrulha o texto que o mobile guarda dentro de um objeto", () => {
    const bruto = { questionId: "injuries", value: "Hérnia de disco L5-S1" };
    expect(lerRespostaTexto(bruto, "injuries")).toBe("Hérnia de disco L5-S1");
  });

  it("lê o texto plano sem mexer", () => {
    expect(lerRespostaTexto("Hérnia de disco L5-S1", "injuries")).toBe("Hérnia de disco L5-S1");
  });

  // Ausente e vazio são a mesma coisa para quem monta o prompt: não há o que
  // dizer ao modelo. Devolver string vazia faria o prompt afirmar que o aluno
  // respondeu algo.
  it.each([undefined, null, "", "   "])("trata %p como sem resposta", (bruto) => {
    expect(lerRespostaTexto(bruto, "injuries")).toBeUndefined();
  });
});

describe("achatamento do mapa de respostas", () => {
  // Linha gravada antes desta correção traz o embrulho em toda chave. A tela do
  // assistente lia `resposta?.value`; passando a ler o valor direto, sem achatar
  // na carga ela mostraria todo campo vazio para quem já tinha respondido.
  it("achata o mapa embrulhado que já está no banco", () => {
    const doBanco = {
      height: { questionId: "height", value: 175 },
      injuries: { questionId: "injuries", value: "Hérnia de disco L5-S1" },
    };
    expect(achatarRespostas(doBanco)).toEqual({ height: 175, injuries: "Hérnia de disco L5-S1" });
  });

  it("deixa o mapa já plano como está", () => {
    expect(achatarRespostas({ height: 175 })).toEqual({ height: 175 });
  });

  // Resposta de múltipla escolha é array. Array tem índice, não `value` — mas a
  // checagem ingênua `typeof === "object"` o alcançaria e devolveria undefined.
  it("não confunde resposta de múltipla escolha com embrulho", () => {
    expect(achatarRespostas({ goals: ["forca", "estetica"] })).toEqual({
      goals: ["forca", "estetica"],
    });
  });

  it("aceita ausência de respostas", () => {
    expect(achatarRespostas(null)).toEqual({});
  });
});

describe("filtro da digitação em campo numérico", () => {
  // `keyboardType="numeric"` não impede letra nenhuma: é dica de teclado. O
  // campo de "há quanto tempo treina" aceitava "uns 3 anos" e gravava a frase
  // inteira numa pergunta numérica.
  it("descarta a letra e fica com o número", () => {
    expect(filtrarEntradaNumerica("uns 3 anos")).toBe("3");
  });

  it("devolve vazio quando não sobrou número nenhum", () => {
    expect(filtrarEntradaNumerica("abc")).toBe("");
  });

  // Quem erra a tecla e escreve "1,7,5" quis 1,75. Truncar no primeiro erro
  // devolveria 1,7 — um valor plausível e errado, que ninguém revisa.
  it("mantém só o primeiro separador e junta o resto do decimal", () => {
    expect(filtrarEntradaNumerica("1,7,5")).toBe("1,75");
  });

  // O separador é o que o aluno digitou, não o que a leitura prefere: trocá-lo
  // embaixo do dedo empurra o cursor para o fim do campo.
  it("preserva o separador escolhido por quem digita", () => {
    expect(filtrarEntradaNumerica("1.5")).toBe("1.5");
    expect(filtrarEntradaNumerica("1,5")).toBe("1,5");
  });

  // Nenhuma pergunta da anamnese tem resposta negativa.
  it("não deixa passar sinal negativo", () => {
    expect(filtrarEntradaNumerica("-70")).toBe("70");
  });
});

describe("declaresContinuousMedication", () => {
  it("resposta vazia ou ausente não declara medicação", () => {
    expect(declaresContinuousMedication(undefined)).toBe(false);
    expect(declaresContinuousMedication("   ")).toBe(false);
  });

  it("as negativas comuns não declaram medicação", () => {
    for (const answer of [
      "Não",
      "nao",
      "NÃO uso",
      "Não tomo.",
      "nenhum",
      "Nenhuma",
      "nada",
      "-",
      "n/a",
    ]) {
      expect(declaresContinuousMedication(answer)).toBe(false);
    }
  });

  // A negativa precisa ser a resposta inteira. Quem escreve "Não, mas tomo atenolol"
  // é justamente quem usa betabloqueador, e é quem mais precisa do aviso nas zonas.
  it("resposta que começa negando mas cita remédio declara medicação", () => {
    expect(declaresContinuousMedication("Não, mas tomo atenolol")).toBe(true);
    expect(declaresContinuousMedication("nada além de propranolol")).toBe(true);
  });

  it("qualquer outro texto declara medicação", () => {
    expect(declaresContinuousMedication("Losartana 50mg")).toBe(true);
    expect(declaresContinuousMedication("uso betabloqueador")).toBe(true);
  });

  it("lê a resposta embrulhada que o mobile grava", () => {
    expect(declaresContinuousMedication({ questionId: "medications", value: "Atenolol" })).toBe(
      true,
    );
  });
});
