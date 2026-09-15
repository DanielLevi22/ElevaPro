import { describe, expect, it } from "vitest";
import { createAdaptiveAnamnesisService } from "../adaptiveAnamnesis.service";
import { criarSupabaseFake } from "./supabaseFake";

const ANSWERS = { main_goal: "Hipertrofia", weight: 78, height: 180, measure_waist: 82 };

describe("adaptiveAnamnesisService — a medida de partida", () => {
  it("ao concluir, o Praticante sem medida declarada ganha a primeira", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: null }, // upsert da anamnese
      { data: [] }, // nenhuma medida declarada ainda
      { data: { id: "nova" } }, // a medida de partida
    ]);

    const result = await createAdaptiveAnamnesisService(supabase).save({
      studentId: "aluno-1",
      answers: ANSWERS,
      completed: true,
      selfGuided: true,
    });

    expect(result).toBe("created");
    expect(chamadas[2].tabela).toBe("physical_assessments");
    expect(chamadas[2].payload).toMatchObject({
      student_id: "aluno-1",
      measured_by: "self",
      weight_kg: 78,
      height_cm: 180,
      circ_waist: 82,
    });
  });

  // Art. 6°, III: a medida mora na Assessment, e não também em `responses`.
  it("grava a anamnese sem as respostas de medida", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });

    await createAdaptiveAnamnesisService(supabase).save({
      studentId: "aluno-1",
      answers: ANSWERS,
      completed: false,
      selfGuided: true,
    });

    expect(chamadas[0].tabela).toBe("student_anamnesis");
    expect(chamadas[0].payload).toMatchObject({
      responses: { main_goal: "Hipertrofia", weight: 78, height: 180 },
      completed_at: null,
    });
  });

  // Editar a anamnese depois não cria outra: a série seguiria do cadastro, e não do
  // que a pessoa registrou de verdade.
  it("quem já tem medida declarada não ganha outra", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: null },
      { data: [{ id: "antiga" }] },
    ]);

    const result = await createAdaptiveAnamnesisService(supabase).save({
      studentId: "aluno-1",
      answers: ANSWERS,
      completed: true,
      selfGuided: true,
    });

    expect(result).toBe("already_measured");
    expect(chamadas).toHaveLength(2);
  });

  it("sem concluir, ou com especialista, não cria medida", async () => {
    for (const input of [
      { completed: false, selfGuided: true },
      { completed: true, selfGuided: false },
    ]) {
      const { supabase, chamadas } = criarSupabaseFake({ data: [] });

      const result = await createAdaptiveAnamnesisService(supabase).save({
        studentId: "aluno-1",
        answers: ANSWERS,
        ...input,
      });

      expect(result).toBe("not_applicable");
      expect(chamadas.map((c) => c.tabela)).toEqual(["student_anamnesis"]);
    }
  });

  it("sem peso e altura válidos, não há medida de partida", async () => {
    const { supabase } = criarSupabaseFake({ data: [] });

    const result = await createAdaptiveAnamnesisService(supabase).save({
      studentId: "aluno-1",
      answers: { weight: 78 },
      completed: true,
      selfGuided: true,
    });

    expect(result).toBe("not_applicable");
  });

  it("a falha ao gravar a anamnese é propagada", async () => {
    const { supabase } = criarSupabaseFake({ error: { code: "42501" } });

    await expect(
      createAdaptiveAnamnesisService(supabase).save({
        studentId: "aluno-1",
        answers: ANSWERS,
        completed: true,
        selfGuided: true,
      }),
    ).rejects.toEqual({ code: "42501" });
  });
});
