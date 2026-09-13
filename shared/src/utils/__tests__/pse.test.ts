import { describe, expect, it } from "vitest";
import { formatPse, PSE_MAX, PSE_MIN, SENSACOES, sensacaoDaPse } from "../pse";

describe("escala de PSE", () => {
  // Esta tabela é o contrato entre as duas pontas: o aluno escolhe no feedback
  // do mobile e o especialista lê no feed do web. As faixas saem do kit, que
  // marca 7 como "Puxado". Se alguém mexer num limite, é aqui que quebra.
  const esperado: [number, string][] = [
    [1, "Leve"],
    [2, "Leve"],
    [3, "Leve"],
    [4, "Na medida"],
    [5, "Na medida"],
    [6, "Na medida"],
    [7, "Puxado"],
    [8, "Puxado"],
    [9, "Puxado"],
    [10, "Puxado"],
  ];

  it.each(esperado)("traduz %i como %s", (valor, rotulo) => {
    expect(sensacaoDaPse(valor).rotulo).toBe(rotulo);
  });

  // Tocar numa sensação move a PSE para o meio da faixa. O valor escolhido
  // precisa cair de volta na mesma sensação — senão o cartão tocado apagaria
  // no mesmo instante em que acende.
  it.each(
    SENSACOES.map((s) => [s.rotulo, s.pse, s] as const),
  )("%s escolhe a PSE %i, que volta a ser a mesma sensação", (_rotulo, pse, sensacao) => {
    expect(sensacaoDaPse(pse)).toBe(sensacao);
  });

  it("escolhe o meio de cada faixa, para baixo quando o meio cai entre dois", () => {
    expect(SENSACOES.map((s) => s.pse)).toEqual([2, 5, 8]);
  });

  // Sem emoji e com o número: numa lista de dez alunos o especialista está
  // comparando valores, não escolhendo o próprio.
  it("mostra número e sensação na versão do especialista", () => {
    expect(formatPse(7)).toBe("7 — Puxado");
  });

  // A coluna é um integer sem CHECK no banco. Um 0 ou um 11 chegando aqui
  // significa que alguém gravou fora da escala — devolver "Leve" para 0
  // esconderia isso do especialista, que leria como esforço registrado.
  it.each([0, 11, -1, 3.5, Number.NaN])("recusa %p com o valor e o formato esperado", (valor) => {
    expect(() => sensacaoDaPse(valor)).toThrow(
      `PSE inválida: ${valor}. Esperado um inteiro entre ${PSE_MIN} e ${PSE_MAX}.`,
    );
  });
});
