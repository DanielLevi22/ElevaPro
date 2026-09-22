import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createWorkoutsService } from "../workouts.service";

describe("workoutsService — periodizações", () => {
  // Regressão do DT-23. `start_date` e `end_date` são NOT NULL desde a
  // migration `0024`. Enquanto o tipo os declarava opcionais, o serviço mandava
  // `null` e o banco recusava o insert — criar periodização falhava sempre, e
  // nada no compilador acusava.
  it("manda as datas que o banco exige, sem null", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "p1" } });

    await createWorkoutsService(supabase).createPeriodization({
      student_id: "aluno-1",
      specialist_id: "esp-1",
      name: "Hipertrofia",
      start_date: "2026-09-01",
      end_date: "2026-12-01",
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload.start_date).toBe("2026-09-01");
    expect(payload.end_date).toBe("2026-12-01");
    expect(payload.status).toBe("planned");
  });

  // Duas periodizações ativas para o mesmo aluno tornam ambíguo qual está
  // valendo. Ativar uma precisa encerrar a anterior na mesma operação.
  it("encerra a periodização ativa do aluno ao ativar outra", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { student_id: "aluno-1" } },
      {},
      { data: { id: "p2", status: "active" } },
    ]);

    await createWorkoutsService(supabase).activatePeriodization("p2");

    expect(chamadas[1].payload).toEqual({ status: "completed" });
    expect(chamadas[1].filtros).toEqual({ student_id: "aluno-1", status: "active" });
    expect(chamadas[2].payload).toEqual({ status: "active" });
    expect(chamadas[2].filtros).toEqual({ id: "p2" });
  });

  it("propaga erro da busca sem tentar ativar nada", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ error: { message: "não encontrada" } });
    await expect(createWorkoutsService(supabase).activatePeriodization("p2")).rejects.toEqual({
      message: "não encontrada",
    });
    expect(chamadas).toHaveLength(1);
  });

  // O aviso in-app ao aluno compara este `updatedAt` com o que ele já viu — só
  // precisa do suficiente pra essa comparação, nunca a periodização inteira.
  it("busca só id, nome e updated_at da periodização ativa do aluno", async () => {
    const { supabase, chamadas } = criarSupabaseFake({
      data: { id: "p1", name: "Hipertrofia", updated_at: "2026-09-20T12:00:00Z" },
    });

    const sinal = await createWorkoutsService(supabase).fetchActiveTrainingSignal("aluno-1");

    expect(chamadas[0].tabela).toBe("training_periodizations");
    expect(chamadas[0].select).toBe("id, name, updated_at");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1", status: "active" });
    expect(sinal).toEqual({ id: "p1", name: "Hipertrofia", updatedAt: "2026-09-20T12:00:00Z" });
  });

  it("devolve null quando o aluno não tem periodização ativa", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    const sinal = await createWorkoutsService(supabase).fetchActiveTrainingSignal("aluno-1");
    expect(sinal).toBeNull();
  });

  it("propaga erro ao buscar o sinal de treino ativo", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(
      createWorkoutsService(supabase).fetchActiveTrainingSignal("aluno-1"),
    ).rejects.toEqual({ message: "42501" });
  });
});

describe("workoutsService — fichas de treino", () => {
  it("manda as datas obrigatórias ao criar a ficha", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "f1" } });

    await createWorkoutsService(supabase).createTrainingPlan({
      periodization_id: "p1",
      name: "Fase 1",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
    });

    const payload = chamadas[0].payload as Record<string, unknown>;
    expect(payload.start_date).toBe("2026-09-01");
    expect(payload.end_date).toBe("2026-09-30");
    expect(payload.order_index).toBe(0);
  });

  // A cópia nasce "planned", nunca herdando o status da original: clonar uma
  // ficha ativa não pode ativar duas ao mesmo tempo.
  it("clona a ficha como planejada, marcando o nome", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      {
        data: {
          id: "f1",
          periodization_id: "p1",
          name: "Fase 1",
          status: "active",
          start_date: "2026-09-01",
          end_date: "2026-09-30",
          order_index: 2,
        },
      },
      { data: { id: "f2" } },
      { data: [] },
    ]);

    await createWorkoutsService(supabase).cloneTrainingPlan("f1");

    const payload = chamadas[1].payload as Record<string, unknown>;
    expect(payload.name).toBe("Fase 1 (Cópia)");
    expect(payload.status).toBe("planned");
    expect(payload.order_index).toBe(2);
  });

  it("copia os treinos da ficha original para a cópia", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "f1", periodization_id: "p1", name: "Fase 1" } },
      { data: { id: "f2" } },
      {
        data: [
          { specialist_id: "esp-1", title: "Treino A", muscle_group: "peito", difficulty: null },
        ],
      },
      {},
    ]);

    await createWorkoutsService(supabase).cloneTrainingPlan("f1");

    const copiados = chamadas[3].payload as Record<string, unknown>[];
    expect(copiados[0].training_plan_id).toBe("f2");
    expect(copiados[0].title).toBe("Treino A");
    // O id da original não pode viajar junto, senão a cópia sobrescreve.
    expect(copiados[0]).not.toHaveProperty("id");
  });

  it("não tenta copiar treino quando a ficha original está vazia", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "f1", name: "Fase 1" } },
      { data: { id: "f2" } },
      { data: [] },
    ]);

    await createWorkoutsService(supabase).cloneTrainingPlan("f1");
    expect(chamadas).toHaveLength(3);
  });

  // Duas fichas ativas na mesma periodização tornam ambíguo qual está valendo.
  // Ativar uma precisa encerrar a anterior na mesma operação.
  it("encerra a ficha ativa da periodização ao ativar outra", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { periodization_id: "p1" } },
      {},
      { data: { id: "f2", status: "active" } },
    ]);

    await createWorkoutsService(supabase).activateTrainingPlan("f2");

    expect(chamadas[1].payload).toEqual({ status: "completed" });
    expect(chamadas[1].filtros).toEqual({ periodization_id: "p1", status: "active" });
    expect(chamadas[2].payload).toEqual({ status: "active" });
    expect(chamadas[2].filtros).toEqual({ id: "f2" });
  });

  it("propaga erro da busca sem tentar ativar nada", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ error: { message: "não encontrada" } });
    await expect(createWorkoutsService(supabase).activateTrainingPlan("f2")).rejects.toEqual({
      message: "não encontrada",
    });
    expect(chamadas).toHaveLength(1);
  });
});
