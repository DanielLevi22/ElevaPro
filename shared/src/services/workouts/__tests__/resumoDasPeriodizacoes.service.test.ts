import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createWorkoutsService } from "../workouts.service";

describe("workoutsService — resumo das periodizações do aluno", () => {
  it("conta fases e treinos por periodização e acha a fase em andamento", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      {
        data: [
          { id: "c1", name: "Verão", status: "active" },
          { id: "c2", name: "Base", status: "completed" },
        ],
      },
      {
        data: [
          {
            id: "f2",
            periodization_id: "c1",
            name: "Hipertrofia",
            status: "active",
            order_index: 1,
          },
          {
            id: "f1",
            periodization_id: "c1",
            name: "Adaptação",
            status: "completed",
            order_index: 0,
          },
          { id: "f3", periodization_id: "c2", name: "Força", status: "completed", order_index: 0 },
        ],
      },
      {
        data: [
          { training_plan_id: "f1" },
          { training_plan_id: "f2" },
          { training_plan_id: "f2" },
          { training_plan_id: "f3" },
        ],
      },
    ]);

    const resumos =
      await createWorkoutsService(supabase).fetchStudentPeriodizationSummaries("aluno-1");

    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1" });
    expect(resumos.map(({ fases, treinos, faseAtual }) => ({ fases, treinos, faseAtual }))).toEqual(
      [
        { fases: 2, treinos: 3, faseAtual: { numero: 2, nome: "Hipertrofia" } },
        { fases: 1, treinos: 1, faseAtual: null },
      ],
    );
  });

  // Minimização (Art. 6°, III): a lista escreve nome e contagem. A prescrição
  // de cada treino não tem por que chegar ao aparelho aqui.
  it("pede só as chaves dos treinos, e colunas nomeadas da periodização", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: [{ id: "c1", status: "active" }] },
      { data: [{ id: "f1", periodization_id: "c1", name: "A", status: "active", order_index: 0 }] },
      { data: [] },
    ]);

    await createWorkoutsService(supabase).fetchStudentPeriodizationSummaries("aluno-1");

    expect(chamadas[0].select).not.toContain("*");
    expect(chamadas[2].tabela).toBe("workouts");
    expect(chamadas[2].select).toBe("training_plan_id");
  });

  it("não consulta fases nem treinos quando o aluno não tem periodização", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    expect(
      await createWorkoutsService(supabase).fetchStudentPeriodizationSummaries("aluno-1"),
    ).toEqual([]);
    expect(chamadas).toHaveLength(1);
  });

  it("propaga o erro das fases em vez de mostrar periodização sem fase", async () => {
    const { supabase } = criarSupabaseFake([
      { data: [{ id: "c1", status: "active" }] },
      { error: { message: "42501" } },
    ]);
    await expect(
      createWorkoutsService(supabase).fetchStudentPeriodizationSummaries("aluno-1"),
    ).rejects.toEqual({
      message: "42501",
    });
  });
});
