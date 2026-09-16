import { describe, expect, it } from "vitest";
import { createMeasurementService } from "../measurement.service";
import { criarSupabaseFake } from "./supabaseFake";

const INPUT = {
  assessed_at: "2026-09-15",
  weight_kg: 78.4,
  height_cm: 180,
  body_fat_pct: 17.2,
  circ_waist: 81.6,
  circ_right_arm: 38,
};

describe("measurementService — leitura", () => {
  it("lista as avaliações do aluno, das duas origens, com colunas nomeadas", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [{ id: "a1" }] });

    await expect(createMeasurementService(supabase).listMeasurements("aluno-1")).resolves.toEqual([
      { id: "a1" },
    ]);
    expect(chamadas[0].tabela).toBe("physical_assessments");
    expect(chamadas[0].select).toContain("measured_by");
    expect(chamadas[0].select).not.toContain("*");
    expect(chamadas[0].filtros.student_id).toBe("aluno-1");
  });
});

describe("measurementService — quem pode declarar", () => {
  it("conta só o vínculo ativo do próprio aluno, sem trazer linha nenhuma", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ count: 1 });

    await expect(createMeasurementService(supabase).hasActiveSpecialist("aluno-1")).resolves.toBe(
      true,
    );
    expect(chamadas[0].tabela).toBe("student_specialists");
    expect(chamadas[0].metodos[0].args[1]).toMatchObject({ head: true, count: "exact" });
    expect(chamadas[0].filtros).toMatchObject({ student_id: "aluno-1", status: "active" });
  });

  it("sem vínculo ativo, o aluno declara", async () => {
    const { supabase } = criarSupabaseFake({ count: 0 });

    await expect(createMeasurementService(supabase).hasActiveSpecialist("aluno-1")).resolves.toBe(
      false,
    );
  });
});

describe("measurementService — a medida declarada", () => {
  it("declara em nome do aluno, como self e sem especialista", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "nova" } });

    await createMeasurementService(supabase).declareMeasurement("aluno-1", INPUT);

    expect(chamadas[0].payload).toEqual({
      ...INPUT,
      student_id: "aluno-1",
      measured_by: "self",
      specialist_id: null,
    });
  });

  // O formulário do aluno não mede dobra cutânea nem escolhe a origem: o que vier
  // além dos campos dele não chega ao banco, nem por engano de quem chama.
  it("grava só os campos do formulário do aluno", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "nova" } });
    const extra = { ...INPUT, skinfold_chest: 12, measured_by: "specialist", specialist_id: "x" };

    await createMeasurementService(supabase).declareMeasurement("aluno-1", extra);

    expect(chamadas[0].payload).not.toHaveProperty("skinfold_chest");
    expect(chamadas[0].payload).toMatchObject({ measured_by: "self", specialist_id: null });
  });

  it("corrige só a medida declarada, sem trocar a origem", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "a1" } });

    await createMeasurementService(supabase).correctMeasurement("a1", { weight_kg: 78 });

    expect(chamadas[0].metodos.map((m) => m.nome)).toContain("update");
    expect(chamadas[0].payload).toEqual({ weight_kg: 78 });
    expect(chamadas[0].filtros).toMatchObject({ id: "a1", measured_by: "self" });
  });

  it("apaga só a medida declarada", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });

    await createMeasurementService(supabase).deleteMeasurement("a1");

    expect(chamadas[0].metodos.map((m) => m.nome)).toContain("delete");
    expect(chamadas[0].filtros).toMatchObject({ id: "a1", measured_by: "self" });
  });

  it("propaga a recusa do banco", async () => {
    const { supabase } = criarSupabaseFake({ error: { code: "42501" } });

    await expect(
      createMeasurementService(supabase).declareMeasurement("aluno-1", INPUT),
    ).rejects.toEqual({
      code: "42501",
    });
  });
});
