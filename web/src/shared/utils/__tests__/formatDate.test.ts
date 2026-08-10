import { describe, expect, it } from "vitest";
import { formatDate, formatDateRange, isDateInRange } from "../formatDate";

describe("formatDate", () => {
  // Regressao: `new Date("2026-08-01")` e lido como UTC; formatado em UTC-3
  // exibia 31 de julho. Todas as datas do produto apareciam um dia atrasadas.
  it("nao desloca a data por causa do fuso", () => {
    expect(formatDate("2026-08-01")).toBe("1 ago");
  });

  // Regressao: o format do date-fns LANCA RangeError com data invalida. O banco
  // tem periodizacao gravada com ano de cinco digitos, e um registro assim
  // derrubava a listagem inteira.
  it.each([
    ["12312-12-23", "ano de cinco digitos"],
    ["not-a-date", "texto qualquer"],
    ["2026-13-45", "mes e dia fora de faixa"],
    ["", "string vazia"],
  ])("devolve travessao para %s (%s) em vez de lancar", (input) => {
    expect(() => formatDate(input)).not.toThrow();
    expect(formatDate(input)).toBe("—");
  });

  it.each([[null], [undefined]])("trata ausencia (%s)", (input) => {
    expect(formatDate(input)).toBe("—");
  });

  it("aceita Date alem de string", () => {
    expect(formatDate(new Date(2026, 7, 1))).toBe("1 ago");
  });

  it.each([
    ["long", "1 de agosto de 2026"],
    ["monthYear", "ago 2026"],
  ] as const)("aplica o estilo %s", (style, expected) => {
    expect(formatDate("2026-08-01", style)).toBe(expected);
  });
});

describe("formatDateRange", () => {
  it("junta as duas pontas", () => {
    expect(formatDateRange("2026-08-01", "2026-09-01")).toBe("1 ago → 1 set");
  });

  // Sem esse caso o intervalo vazio viraria "— → —", que nao comunica nada.
  it("colapsa para um travessao quando nao ha nenhuma data", () => {
    expect(formatDateRange(null, null)).toBe("—");
  });

  it("preserva a ponta valida quando so uma falta", () => {
    expect(formatDateRange("2026-08-01", null)).toBe("1 ago → —");
  });

  it("nao lanca com uma ponta corrompida", () => {
    expect(() => formatDateRange("12312-12-23", "2026-09-01")).not.toThrow();
    expect(formatDateRange("12312-12-23", "2026-09-01")).toBe("— → 1 set");
  });
});

describe("isDateInRange", () => {
  it("aceita data dentro da faixa", () => {
    expect(isDateInRange("2026-08-01")).toBe(true);
  });

  it.each<[string | null, string]>([
    ["12312-12-23", "ano de cinco digitos"],
    ["1899-12-31", "anterior ao minimo"],
    ["2101-01-01", "posterior ao maximo"],
    [null, "ausente"],
  ])("rejeita %s (%s)", (input) => {
    expect(isDateInRange(input)).toBe(false);
  });
});
