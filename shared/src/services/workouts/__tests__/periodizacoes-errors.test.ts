import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createWorkoutsService } from "../workouts.service";

describe("workoutsService — falhas de consultas de periodização", () => {
  it("interrompe a ativação ao falhar ao encerrar a periodização anterior", async () => {
    const erro = { message: "42501" };
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { student_id: "aluno-1" } },
      { error: erro },
    ]);

    await expect(createWorkoutsService(supabase).activatePeriodization("p2")).rejects.toEqual(erro);
    expect(chamadas).toHaveLength(2);
  });

  it("propaga a falha dos perfis em vez de devolver periodizações incompletas", async () => {
    const erro = { message: "profiles indisponível" };
    const { supabase } = criarSupabaseFake([
      { data: [{ id: "p1", student_id: "aluno-1" }] },
      { error: erro },
    ]);

    await expect(createWorkoutsService(supabase).fetchPeriodizations("esp-1")).rejects.toEqual(
      erro,
    );
  });

  it("propaga a falha das fases em vez de devolver contagem zero", async () => {
    const erro = { message: "fases indisponíveis" };
    const { supabase } = criarSupabaseFake([
      { data: [{ id: "p1", student_id: "aluno-1" }] },
      { data: [] },
      { error: erro },
    ]);

    await expect(createWorkoutsService(supabase).fetchPeriodizations("esp-1")).rejects.toEqual(
      erro,
    );
  });

  it("propaga erro ao contar treinos de uma fase", async () => {
    const erro = { message: "workouts indisponível" };
    const { supabase } = criarSupabaseFake([{ data: [{ id: "f1" }] }, { error: erro }]);

    await expect(
      createWorkoutsService(supabase).fetchTrainingPlans("periodizacao-1"),
    ).rejects.toEqual(erro);
  });

  it("propaga erro ao contar treinos da ficha", async () => {
    const erro = { message: "workouts indisponível" };
    const { supabase } = criarSupabaseFake([{ data: { id: "f1" } }, { error: erro }]);

    await expect(createWorkoutsService(supabase).fetchTrainingPlanById("f1")).rejects.toEqual(erro);
  });

  it("não apaga uma ficha quando sua leitura falha", async () => {
    const erro = { message: "fase indisponível" };
    const { supabase, chamadas } = criarSupabaseFake({ error: erro });

    await expect(createWorkoutsService(supabase).deleteTrainingPlan("f1")).rejects.toEqual(erro);
    expect(chamadas).toHaveLength(1);
  });

  it("não clona treinos quando a leitura da original falha", async () => {
    const erro = { message: "treinos indisponíveis" };
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "f1", periodization_id: "p1", name: "Fase 1" } },
      { data: { id: "f2" } },
      { error: erro },
    ]);

    await expect(createWorkoutsService(supabase).cloneTrainingPlan("f1")).rejects.toEqual(erro);
    expect(chamadas).toHaveLength(3);
  });
});
