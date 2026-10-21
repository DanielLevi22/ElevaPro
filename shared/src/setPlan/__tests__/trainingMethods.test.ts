import { describe, expect, it } from "vitest";
import { TRAINING_METHODS, validateSetPlan } from "..";

describe("TRAINING_METHODS — o catálogo de técnicas", () => {
  it("não repete identificador nem rótulo", () => {
    const ids = TRAINING_METHODS.map((m) => m.id);
    const labels = TRAINING_METHODS.map((m) => m.label);
    expect(new Set(ids).size, "IDENTIFICADOR REPETIDO no catálogo").toBe(ids.length);
    expect(new Set(labels).size, "RÓTULO REPETIDO no catálogo").toBe(labels.length);
  });

  // LGPD Art. 11. A BFR (restrição de fluxo sanguíneo) prescreve a pressão do
  // manguito, que é dado de saúde e pede triagem. Entrar no catálogo traria esse
  // dado para a prescrição, que tem base em execução de contrato (Art. 7°, V).
  it("a BFR não entra no catálogo", () => {
    const bfr = TRAINING_METHODS.filter((m) => /bfr|oclus|fluxo/i.test(`${m.id} ${m.label}`));
    expect(bfr, "DADO DE SAÚDE NA PRESCRIÇÃO: a BFR entrou no catálogo de técnicas").toEqual([]);
  });

  it("toda técnica tem explicação curta", () => {
    for (const m of TRAINING_METHODS) {
      expect(m.explanation.length, `SEM EXPLICAÇÃO: ${m.id}`).toBeGreaterThan(40);
      expect(m.explanation.length, `EXPLICAÇÃO LONGA DEMAIS: ${m.id}`).toBeLessThan(260);
    }
  });

  // A referência sustenta o que a explicação afirma, e o especialista precisa
  // poder conferir na fonte. Só artigo científico indexado: nunca outro app,
  // blog ou site de academia (decidido na #431).
  it("toda referência aponta para PubMed, PMC ou DOI", () => {
    const allowed =
      /^https:\/\/(pubmed\.ncbi\.nlm\.nih\.gov|pmc\.ncbi\.nlm\.nih\.gov|doi\.org)\/.+/;
    for (const m of TRAINING_METHODS) {
      if (!m.reference) continue;
      expect(m.reference.url, `FONTE NÃO CIENTÍFICA em ${m.id}: ${m.reference.url}`).toMatch(
        allowed,
      );
      expect(m.reference.label, `REFERÊNCIA SEM LEGENDA em ${m.id}`).toMatch(/\d{4}$/);
    }
  });

  it("toda técnica do catálogo é aceita no plano", () => {
    const set = {
      methods: TRAINING_METHODS.map((m) => m.id),
      reps: { mode: "failure" },
      weight_kg: null,
      rest_seconds: null,
      target_rir: null,
      segments: [],
    };
    expect(() => validateSetPlan([set])).not.toThrow();
  });
});
