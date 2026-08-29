import { describe, expect, it } from "vitest";
import { lerRespostaNumerica } from "../anamnese";

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
