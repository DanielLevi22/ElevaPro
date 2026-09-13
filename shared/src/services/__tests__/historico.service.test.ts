import { describe, expect, it } from "vitest";
import { createWorkoutsService } from "../workouts.service";
import { criarSupabaseFake } from "./supabaseFake";

describe("workoutsService — histórico de sessões", () => {
  it("pede colunas nomeadas, com a PSE pelo nome novo", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });

    await createWorkoutsService(supabase).fetchSessionHistory("aluno-1");

    expect(chamadas[0].tabela).toBe("workout_sessions");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1" });
    expect(chamadas[0].select).toContain("perceived_exertion");
    expect(chamadas[0].select).not.toContain("*");
    expect(chamadas[0].select).not.toMatch(/\bintensity\b/);
  });

  // O PostgREST devolve o recurso embutido como objeto ou como lista, conforme
  // consegue provar que a chave é única. Os dois viram o mesmo número.
  it("traz a FC da junção para a sessão, venha como objeto ou como lista", async () => {
    const { supabase } = criarSupabaseFake({
      data: [
        { id: "s1", vitals: { avg_heart_rate: 150 } },
        { id: "s2", vitals: [{ avg_heart_rate: 162 }] },
        { id: "s3", vitals: [] },
      ],
    });

    const sessoes = await createWorkoutsService(supabase).fetchSessionHistory("aluno-1");

    expect(sessoes.map((s) => s.avg_heart_rate)).toEqual([150, 162, null]);
    expect(sessoes.every((s) => !("vitals" in s))).toBe(true);
  });

  it("propaga o erro em vez de devolver histórico vazio", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(createWorkoutsService(supabase).fetchSessionHistory("aluno-1")).rejects.toEqual({
      message: "42501",
    });
  });
});

describe("workoutsService — última execução de um treino", () => {
  it("busca a última concluída do treino e do aluno, série a série", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });

    const anterior = await createWorkoutsService(supabase).fetchUltimaSessaoDoTreino(
      "treino-1",
      "aluno-1",
    );

    expect(anterior).toBeNull();
    expect(chamadas[0].filtros).toEqual({ workout_id: "treino-1", student_id: "aluno-1" });
    expect(chamadas[0].select).toContain("weight_actual");
  });

  // A comparação de carga não precisa do que o aluno escreveu. Pedir `notes`
  // aqui traria dado de saúde para uma tela que só soma quilos.
  it("não pede a observação nem a PSE", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });
    await createWorkoutsService(supabase).fetchUltimaSessaoDoTreino("treino-1", "aluno-1");
    expect(chamadas[0].select).not.toContain("notes");
    expect(chamadas[0].select).not.toContain("perceived_exertion");
  });
});

describe("workoutsService — peso para o gasto calórico", () => {
  it("usa a avaliação física mais recente quando ela existe", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { weight_kg: "81.5" } });

    const peso = await createWorkoutsService(supabase).fetchPesoParaGasto("aluno-1");

    expect(peso).toBe(81.5);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].select).toBe("weight_kg");
  });

  it("cai no peso declarado na anamnese quando não há avaliação", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: null },
      { data: { responses: { weight: { value: 74 } } } },
    ]);

    const peso = await createWorkoutsService(supabase).fetchPesoParaGasto("aluno-1");

    expect(peso).toBe(74);
    expect(chamadas[1].tabela).toBe("student_anamnesis");
  });

  // Um padrão inventado aqui ficaria indistinguível de um peso medido. Quem
  // chama escolhe o padrão, e sabe que escolheu.
  it("devolve null sem avaliação e sem peso declarado", async () => {
    const { supabase } = criarSupabaseFake([{ data: null }, { data: { responses: {} } }]);
    expect(await createWorkoutsService(supabase).fetchPesoParaGasto("aluno-1")).toBeNull();
  });

  // Sem ler o erro, a RLS negando a anamnese chegaria igual a um aluno que
  // nunca a preencheu — e os dois virariam o padrão em silêncio.
  it("propaga a recusa da anamnese em vez de tratá-la como ausência", async () => {
    const { supabase } = criarSupabaseFake([{ data: null }, { error: { message: "42501" } }]);
    await expect(createWorkoutsService(supabase).fetchPesoParaGasto("aluno-1")).rejects.toEqual({
      message: "42501",
    });
  });
});
