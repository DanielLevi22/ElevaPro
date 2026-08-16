import { describe, expect, it } from "vitest";
import { physicalAssessments } from "../../database/schema/assessment";
import { CIRCUMFERENCE_FIELDS, SKINFOLD_FIELDS } from "../physicalAssessment.types";

/**
 * As listas da ficha só valem se cada chave for uma coluna de verdade.
 *
 * Foi exatamente a falta desta amarração que deixou o formulário do web coletar
 * catorze medidas com nomes que o banco nunca teve, e o mobile exibir outros
 * treze. Comparar contra o schema Drizzle é o que impede as listas de voltarem
 * a descrever uma tabela imaginária.
 */
const COLUNAS = new Set(Object.keys(physicalAssessments));

describe("campos da ficha de avaliação", () => {
  it("toda circunferência da ficha existe na tabela", () => {
    const inexistentes = CIRCUMFERENCE_FIELDS.filter((f) => !COLUNAS.has(f.key));
    expect(inexistentes.map((f) => f.key)).toEqual([]);
  });

  it("toda dobra cutânea da ficha existe na tabela", () => {
    const inexistentes = SKINFOLD_FIELDS.filter((f) => !COLUNAS.has(f.key));
    expect(inexistentes.map((f) => f.key)).toEqual([]);
  });

  it("as medidas bilaterais vêm em par", () => {
    // Meia medida bilateral é pior que nenhuma: a assimetria é justamente o que
    // a análise por imagem reporta, e comparar um lado só não diz nada.
    const chaves = CIRCUMFERENCE_FIELDS.map((f) => f.key as string);
    for (const direita of chaves.filter((k) => k.startsWith("circ_right_"))) {
      expect(chaves).toContain(direita.replace("circ_right_", "circ_left_"));
    }
    for (const esquerda of chaves.filter((k) => k.startsWith("circ_left_"))) {
      expect(chaves).toContain(esquerda.replace("circ_left_", "circ_right_"));
    }
  });

  it("não há chave repetida entre as duas listas", () => {
    const todas = [...CIRCUMFERENCE_FIELDS, ...SKINFOLD_FIELDS].map((f) => f.key);
    expect(new Set(todas).size).toBe(todas.length);
  });
});
