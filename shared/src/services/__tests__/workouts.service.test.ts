import { describe, expect, it } from "vitest";
import { createWorkoutsService } from "../workouts.service";
import { criarSupabaseFake } from "./supabaseFake";

describe("workoutsService — catálogo de exercícios", () => {
  // Regressão: o filtro de linhas-placeholder vivia no hook do web, então o
  // mobile listava "Adicionar exercício" como se fosse exercício de verdade.
  // Aqui ele vale para as duas plataformas.
  it("esconde as linhas-placeholder do catálogo", async () => {
    const { supabase } = criarSupabaseFake({
      data: [
        { id: "1", name: "Supino reto" },
        { id: "2", name: "Adicionar exercício" },
        { id: "3", name: "adicionar exercicios" },
        { id: "4", name: "   " },
        { id: "5", name: "Agachamento" },
      ],
    });

    const exercicios = await createWorkoutsService(supabase).fetchExercises();
    expect(exercicios.map((e) => e.name)).toEqual(["Supino reto", "Agachamento"]);
  });

  it("propaga erro em vez de devolver catálogo vazio", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(createWorkoutsService(supabase).fetchExercises()).rejects.toEqual({
      message: "42501",
    });
  });
});

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
});

describe("workoutsService — exercícios do treino", () => {
  // A ordem na tela vem de `order_index`. Sem o índice do laço como padrão,
  // vários exercícios entrariam com o mesmo valor e a ordem viraria a do banco.
  it("usa a posição na lista quando o item não traz order_index", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).addExercisesToWorkout("t1", [
      { exercise_id: "e1", sets: 3, reps: "10" },
      { exercise_id: "e2", sets: 4, reps: "8" },
      { exercise_id: "e3", sets: 3, reps: "12", order_index: 9 },
    ]);

    const linhas = chamadas[0].payload as Record<string, unknown>[];
    expect(linhas.map((l) => l.order_index)).toEqual([0, 1, 9]);
    expect(linhas.every((l) => l.workout_id === "t1")).toBe(true);
  });

  // Campo ausente vira `null`, não `undefined`: o PostgREST omite chave
  // `undefined` do corpo, e a coluna ficaria com o default em vez de vazia.
  it("normaliza campo ausente para null", async () => {
    const { supabase, chamadas } = criarSupabaseFake({});

    await createWorkoutsService(supabase).addExercisesToWorkout("t1", [{ exercise_id: "e1" }]);

    const linha = (chamadas[0].payload as Record<string, unknown>[])[0];
    expect(linha.sets).toBeNull();
    expect(linha.reps).toBeNull();
    expect(linha.weight).toBeNull();
    expect(linha.notes).toBeNull();
  });
});
