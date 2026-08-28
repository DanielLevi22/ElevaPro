import { describe, expect, it } from "vitest";
import { createActivityService } from "../activity.service";
import { criarSupabaseFake } from "./supabaseFake";

const VINCULOS = { data: [{ student_id: "aluno-1" }] };
const PERFIS = { data: [{ id: "aluno-1", full_name: "Marina Costa" }] };

function sessao(over: Record<string, unknown> = {}) {
  return {
    id: "s1",
    student_id: "aluno-1",
    started_at: "2026-08-28T10:00:00Z",
    completed_at: "2026-08-28T11:00:00Z",
    intensity: 8,
    notes: null,
    session_type: "strength",
    duration_seconds: null,
    active_calories: null,
    activity_name: null,
    ...over,
  };
}

describe("activityService — bloco recente do briefing", () => {
  // D6.3: o filtro antigo era `.eq("workouts.specialist_id", user.id)` — "treinos
  // que eu criei", não "alunos que são meus". Como a linha sintética de cardio
  // nascia com o id do ALUNO nessa coluna, nenhuma sessão de cardio podia
  // aparecer, de nenhum aluno, nunca. O universo tem de sair do vínculo.
  it("parte do vínculo ativo, e não do dono do treino", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      VINCULOS,
      { data: [] },
      { data: [] },
      PERFIS,
    ]);
    await createActivityService(supabase).fetchRecentActivity("espec-1");

    expect(chamadas[0].tabela).toBe("student_specialists");
    expect(chamadas[0].filtros).toEqual({ specialist_id: "espec-1", status: "active" });
    expect(chamadas.some((c) => c.tabela === "workouts")).toBe(false);
  });

  it("mostra o cardio que o filtro antigo tornava impossível", async () => {
    const { supabase } = criarSupabaseFake([
      VINCULOS,
      { data: [sessao({ session_type: "cardio", activity_name: "Corrida" })] },
      { data: [] },
      PERFIS,
    ]);

    const itens = await createActivityService(supabase).fetchRecentActivity("espec-1");

    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({
      kind: "cardio",
      title: "Corrida",
      studentName: "Marina Costa",
    });
  });

  // D6.4: o bloco antigo somava três consultas com teto próprio (5 + 3 + 3) e
  // cortava a soma em 10. Com 12 sessões no mesmo dia, o especialista via 5 —
  // e nenhuma quantidade de atividade fazia a sexta aparecer.
  it("corta em 10 no resultado ordenado, não por fonte", async () => {
    const doze = Array.from({ length: 12 }, (_, i) =>
      sessao({ id: `s${i}`, completed_at: `2026-08-${String(10 + i).padStart(2, "0")}T10:00:00Z` }),
    );

    const { supabase } = criarSupabaseFake([VINCULOS, { data: doze }, { data: [] }, PERFIS]);
    const itens = await createActivityService(supabase).fetchRecentActivity("espec-1");

    expect(itens).toHaveLength(10);
    // O mais recente primeiro: a ordenação é do conjunto, não de cada fonte.
    expect(itens[0].at).toBe("2026-08-21T10:00:00Z");
  });

  // D6.5: a janela de 7 dias fazia o especialista de férias ver "Nenhuma
  // atividade" com o histórico cheio. Para "os 10 últimos" a pergunta é de
  // ordenação, não de intervalo.
  it("não filtra por janela de dias", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      VINCULOS,
      { data: [] },
      { data: [] },
      PERFIS,
    ]);
    await createActivityService(supabase).fetchRecentActivity("espec-1");

    const sessoes = chamadas.find((c) => c.tabela === "workout_sessions");
    expect(sessoes?.metodos.some((m) => m.nome === "gte")).toBe(false);
  });

  // O que atravessa a fronteira é o item resumido. O briefing é Server Component
  // justamente para o dado de saúde cru não chegar ao HTML da página.
  it("não devolve as observações do aluno no bloco recente", async () => {
    const { supabase } = criarSupabaseFake([
      VINCULOS,
      { data: [sessao({ notes: "senti dor no ombro" })] },
      { data: [] },
      PERFIS,
    ]);

    const itens = await createActivityService(supabase).fetchRecentActivity("espec-1");
    expect(JSON.stringify(itens)).not.toContain("dor no ombro");
  });

  it("devolve vazio sem consultar nada quando não há aluno vinculado", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: [] }]);
    expect(await createActivityService(supabase).fetchRecentActivity("espec-1")).toEqual([]);
    expect(chamadas).toHaveLength(1);
  });
});

describe("activityService — atividades do aluno", () => {
  const semNada = [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  it("nomeia as colunas de `workout_sessions` em vez de pedir `*`", async () => {
    const { supabase, chamadas } = criarSupabaseFake(semNada);
    await createActivityService(supabase).fetchStudentActivities("aluno-1");

    const sessoes = chamadas.find((c) => c.tabela === "workout_sessions");
    expect(sessoes?.select).not.toBe("*");
    expect(sessoes?.select).toContain("notes");
    expect(sessoes?.select).toContain("session_type");
  });

  it("agrupa por dia e mostra RPE e a observação do aluno", async () => {
    const { supabase } = criarSupabaseFake([
      { data: [sessao({ notes: "senti dor no ombro", workout: { title: "Treino A" } })] },
      ...semNada.slice(1),
    ]);

    const dias = await createActivityService(supabase).fetchStudentActivities("aluno-1");

    expect(dias).toHaveLength(1);
    expect(dias[0].events[0]).toMatchObject({
      kind: "workout",
      title: "Treino A",
      rpe: 8,
      studentNote: "senti dor no ombro",
    });
  });

  it("rotula o cardio com duração e calorias, nunca como treino", async () => {
    const { supabase } = criarSupabaseFake([
      {
        data: [
          sessao({
            session_type: "cardio",
            activity_name: "Corrida",
            duration_seconds: 1920,
            active_calories: 280,
            workout: null,
          }),
        ],
      },
      ...semNada.slice(1),
    ]);

    const dias = await createActivityService(supabase).fetchStudentActivities("aluno-1");
    expect(dias[0].events[0]).toMatchObject({
      kind: "cardio",
      title: "Corrida",
      detail: "32 min · 280 kcal",
    });
  });

  // Sessão anterior à `0035` chega com as três colunas nulas: duração e calorias
  // moravam dentro de `notes` e não são recuperáveis. "0 min" seria uma medida
  // inventada — zero é um valor, ausência não é.
  it("omite o detalhe do cardio antigo em vez de exibir zero", async () => {
    const { supabase } = criarSupabaseFake([
      { data: [sessao({ session_type: "cardio", workout: null })] },
      ...semNada.slice(1),
    ]);

    const dias = await createActivityService(supabase).fetchStudentActivities("aluno-1");
    expect(dias[0].events[0].detail).toBeNull();
  });

  // `diet_plans` é o caso que uma lista de autoria escrita à mão erraria: o
  // mesmo tipo de evento tem autores diferentes conforme `specialist_id`.
  it("atribui o plano alimentar ao member quando `specialist_id` é nulo", async () => {
    const dietas = {
      data: [
        {
          id: "d1",
          name: "Plano do member",
          created_at: "2026-08-28T09:00:00Z",
          status: "active",
          specialist_id: null,
        },
        {
          id: "d2",
          name: "Plano do personal",
          created_at: "2026-08-28T08:00:00Z",
          status: "active",
          specialist_id: "espec-1",
        },
      ],
    };

    const { supabase } = criarSupabaseFake([
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      dietas,
    ]);

    const todos = await createActivityService(supabase).fetchStudentActivities("aluno-1", "all");
    const porTitulo = new Map(todos[0].events.map((e) => [e.title, e.author]));

    expect(porTitulo.get("Plano do member")).toBe("student");
    expect(porTitulo.get("Plano do personal")).toBe("specialist");
  });

  it("filtra por autoria, e o padrão é o aluno", async () => {
    const avaliacoes = { data: [{ id: "a1", created_at: "2026-08-28T09:00:00Z", weight_kg: 80 }] };
    const respostas = [
      { data: [sessao({ workout: { title: "Treino A" } })] },
      { data: [] },
      { data: [] },
      avaliacoes,
      { data: [] },
    ];

    const padrao = await createActivityService(
      criarSupabaseFake(respostas).supabase,
    ).fetchStudentActivities("aluno-1");
    expect(padrao[0].events.map((e) => e.kind)).toEqual(["workout"]);

    const doEspecialista = await createActivityService(
      criarSupabaseFake(respostas).supabase,
    ).fetchStudentActivities("aluno-1", "specialist");
    expect(doEspecialista[0].events.map((e) => e.kind)).toEqual(["assessment"]);

    const todos = await createActivityService(
      criarSupabaseFake(respostas).supabase,
    ).fetchStudentActivities("aluno-1", "all");
    expect(todos[0].events).toHaveLength(2);
  });

  // Para o especialista a ausência é a informação: três dias vazios seguidos é
  // o que ele precisa ver, e uma lista que pula de 28 para 25 esconde isso.
  it("mantém os dias sem registro entre o primeiro e o último evento", async () => {
    const { supabase } = criarSupabaseFake([
      {
        data: [
          sessao({ id: "s1", completed_at: "2026-08-28T10:00:00Z", workout: null }),
          sessao({ id: "s2", completed_at: "2026-08-25T10:00:00Z", workout: null }),
        ],
      },
      ...semNada.slice(1),
    ]);

    const dias = await createActivityService(supabase).fetchStudentActivities("aluno-1");

    expect(dias.map((d) => d.date)).toEqual([
      "2026-08-28",
      "2026-08-27",
      "2026-08-26",
      "2026-08-25",
    ]);
    expect(dias[1].events).toEqual([]);
    // Ordem decrescente: o dia mais recente primeiro.
    expect(dias[0].events).toHaveLength(1);
  });

  it("usa a meta de `daily_goals` em vez de recontar", async () => {
    const metas = {
      data: [
        {
          student_id: "aluno-1",
          date: "2026-08-28",
          meals_target: 4,
          meals_completed: 3,
          workout_target: 1,
          workout_completed: 1,
          completed: false,
        },
      ],
    };

    const { supabase } = criarSupabaseFake([
      { data: [] },
      { data: [] },
      metas,
      { data: [] },
      { data: [] },
    ]);
    const dias = await createActivityService(supabase).fetchStudentActivities("aluno-1");

    expect(dias[0].summary).toEqual({
      mealsTarget: 4,
      mealsCompleted: 3,
      workoutTarget: 1,
      workoutCompleted: 1,
      completed: false,
    });
  });
});
