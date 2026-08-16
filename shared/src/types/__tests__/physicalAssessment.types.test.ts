import { describe, expect, it } from "vitest";
import { CIRCUMFERENCE_FIELDS, SKINFOLD_FIELDS } from "../physicalAssessment.types";

/**
 * Regras estruturais da ficha de avaliação.
 *
 * A amarração com o banco **não** vive aqui: importar o schema Drizzle traria
 * `drizzle-orm/pg-core`, que não está instalado em `web/` — passava no local
 * por hoisting do node_modules e quebrava no CI, onde cada projeto instala só
 * as próprias dependências. Quem garante que cada `key` é uma coluna real é o
 * `satisfies ReadonlyArray<{ key: keyof PhysicalAssessment }>` na definição das
 * listas, checado em tempo de compilação nas duas plataformas.
 */
describe("campos da ficha de avaliação", () => {
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

  it("toda circunferência é uma coluna `circ_` e toda dobra é `skinfold_`", () => {
    // O prefixo é o que separa as duas listas na hora de montar o formulário.
    // Uma chave no grupo errado entraria na aba errada da ficha.
    expect(CIRCUMFERENCE_FIELDS.every((f) => f.key.startsWith("circ_"))).toBe(true);
    expect(SKINFOLD_FIELDS.every((f) => f.key.startsWith("skinfold_"))).toBe(true);
  });

  it("todo campo tem rótulo legível", () => {
    for (const campo of [...CIRCUMFERENCE_FIELDS, ...SKINFOLD_FIELDS]) {
      expect(campo.label.trim().length).toBeGreaterThan(0);
    }
  });
});
