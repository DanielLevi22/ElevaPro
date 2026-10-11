import { describe, expect, it } from "vitest";
import { allowedFoodNames } from "../foodFilter";

/** Nomes reais do banco de alimentos público. */
const BANCO = [
  "Leite integral",
  "Leite sem lactose desnatado",
  "Bebida de soja sem açúcar",
  "Queijo minas frescal",
  "Iogurte grego natural",
  "Whey protein (pó)",
  "Barra de proteína",
  "Manteiga",
  "Manteiga ghee",
  "Pão francês",
  "Pão de queijo",
  "Macarrão cozido",
  "Seitan",
  "Tapioca (goma)",
  "Biscoito de arroz",
  "Arroz branco cozido",
  "Carne bovina (patinho)",
  "Carne suína (lombo assado)",
  "Frango (peito grelhado)",
  "Tilápia grelhada",
  "Salmão grelhado",
  "Ovo inteiro cozido",
  "Clara de ovo",
  "Albumina (pó)",
  "Crepioca",
  "Tofu",
  "Feijão carioca cozido",
];

const permitidos = (exclusions: string[], style = "Onívoro") =>
  allowedFoodNames(BANCO, { exclusions, style });

describe("allowedFoodNames", () => {
  it("sem exclusão, tudo entra", () => {
    expect(permitidos([])).toEqual(BANCO);
  });

  it("sem lactose tira o que tem leite, mas mantém o que diz que não tem", () => {
    const lista = permitidos(["Lactose"]);
    expect(lista).not.toContain("Leite integral");
    expect(lista).not.toContain("Queijo minas frescal");
    expect(lista).not.toContain("Pão de queijo");
    expect(lista).not.toContain("Whey protein (pó)");
    expect(lista).not.toContain("Barra de proteína");
    expect(lista).toContain("Leite sem lactose desnatado");
    expect(lista).toContain("Bebida de soja sem açúcar");
  });

  it("sem glúten tira trigo e seitan, e mantém arroz e tapioca", () => {
    const lista = permitidos(["Glúten"]);
    for (const nome of ["Pão francês", "Macarrão cozido", "Seitan"])
      expect(lista).not.toContain(nome);
    for (const nome of ["Tapioca (goma)", "Biscoito de arroz", "Arroz branco cozido"])
      expect(lista).toContain(nome);
  });

  it("sem carne vermelha tira boi e porco, e mantém frango e peixe", () => {
    const lista = permitidos(["Carne vermelha"]);
    expect(lista).not.toContain("Carne bovina (patinho)");
    expect(lista).not.toContain("Carne suína (lombo assado)");
    expect(lista).toContain("Frango (peito grelhado)");
    expect(lista).toContain("Tilápia grelhada");
  });

  it("sem ovo tira o ovo também onde ele está escondido", () => {
    const lista = permitidos(["Ovo"]);
    for (const nome of ["Ovo inteiro cozido", "Clara de ovo", "Albumina (pó)", "Crepioca"]) {
      expect(lista).not.toContain(nome);
    }
  });

  it("vegetariano tira toda carne e peixe, e mantém ovo e leite", () => {
    const lista = permitidos([], "Vegetariano");
    for (const nome of ["Carne bovina (patinho)", "Frango (peito grelhado)", "Salmão grelhado"]) {
      expect(lista).not.toContain(nome);
    }
    expect(lista).toContain("Ovo inteiro cozido");
    expect(lista).toContain("Leite integral");
  });

  it("vegano tira também ovo, leite e derivados animais", () => {
    const lista = permitidos([], "Vegano");
    for (const nome of [
      "Ovo inteiro cozido",
      "Leite integral",
      "Leite sem lactose desnatado",
      "Whey protein (pó)",
      "Manteiga ghee",
    ]) {
      expect(lista).not.toContain(nome);
    }
    expect(lista).toContain("Tofu");
    expect(lista).toContain("Bebida de soja sem açúcar");
    expect(lista).toContain("Feijão carioca cozido");
  });

  /**
   * TRAVA — o alimento que a pessoa achou na busca do "Não como" não aparece
   * (#365). Ele chega pelo nome do banco, e sai pelo mesmo nome.
   */
  it("tira o alimento escolhido na busca, pelo nome do banco", () => {
    const lista = permitidos(["Tilápia grelhada"]);
    if (lista.includes("Tilápia grelhada"))
      throw new Error("ALIMENTO EXCLUÍDO NO PLANO: a tilápia ficou");
    expect(lista).toContain("Salmão grelhado");
  });
});
