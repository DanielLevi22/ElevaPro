import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../../../../../shared/src/services/__tests__/supabaseFake";
import { loadScaleSources } from "../scaleSources";

describe("loadScaleSources", () => {
  it("traz a última medida de cada origem e a altura e o peso da anamnese", async () => {
    const { supabase } = criarSupabaseFake([
      { data: { height_cm: "178.00", weight_kg: "82.50" } },
      { data: { height_cm: 176, weight_kg: 79 } },
      { data: { height: 170, weight: 70 } },
    ]);

    await expect(loadScaleSources(supabase, "aluno-1")).resolves.toEqual({
      ok: true,
      sources: {
        specialistAssessment: { height_cm: 178, weight_kg: 82.5 },
        declaredAssessment: { height_cm: 176, weight_kg: 79 },
        anamnese: { height: 170, weight: 70 },
      },
    });
  });

  // Uma consulta por origem: a última medida de todas poderia ser a declarada e
  // esconder a do especialista, que vence na Escala.
  it("pede a medida de cada origem separada, e da anamnese só altura e peso", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });

    await loadScaleSources(supabase, "aluno-1");

    expect(chamadas.map((c) => [c.tabela, c.filtros.measured_by ?? null])).toEqual([
      ["physical_assessments", "specialist"],
      ["physical_assessments", "self"],
      ["student_anamnesis", null],
    ]);
    // Art. 6°, III: `responses` inteiro traria lesão e medicação para ler a altura.
    expect(chamadas[2].select).toBe("responses->height, responses->weight");
  });

  // Erro não é ausência: "falhou a consulta" viraria "não tem medida", e o aluno
  // seria mandado preencher o que já preencheu.
  it("falha quando qualquer consulta falha, em vez de tratar como sem medida", async () => {
    const { supabase } = criarSupabaseFake([
      { data: null },
      { error: { message: "x" } },
      { data: null },
    ]);

    await expect(loadScaleSources(supabase, "aluno-1")).resolves.toEqual({ ok: false });
  });
});
