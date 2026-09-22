import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createAdherenceService } from "../adherence.service";

const HOJE = "2026-09-21";

describe("adherenceService.fetchStudentAdherence", () => {
  // O peso vai todo para o treino quando não há dieta ativa — nunca 0% pela
  // metade que falta.
  it("pesa só o treino quando o aluno não tem plano de dieta ativo", async () => {
    const { supabase } = criarSupabaseFake([
      { data: { id: "periodizacao-1" } }, // training_periodizations ativa
      { data: { id: "fase-1" } }, // training_plans (fase) ativa
      { count: 4 }, // workouts prescritos na fase (4x/semana)
      { count: 3 }, // workout_sessions concluídas nos últimos 7 dias
      { data: null }, // getMealPlanOutline: sem plano de dieta ativo
    ]);

    const aderencia = await createAdherenceService(supabase).fetchStudentAdherence("aluno-1", HOJE);

    expect(aderencia).toBe(75); // 3 de 4
  });

  // Mesma regra do outro lado: sem periodização ativa, o peso vai todo para a dieta.
  it("pesa só a dieta quando o aluno não tem periodização ativa", async () => {
    const { supabase } = criarSupabaseFake([
      { data: null }, // sem training_periodizations ativa
      {
        data: {
          plan_type: "unique",
          start_date: HOJE,
          meals: [
            { id: "m1", day_of_week: null },
            { id: "m2", day_of_week: null },
          ],
        },
      },
      { data: [{ logged_date: HOJE, diet_meal_id: "m1", completed: true }] },
    ]);

    const aderencia = await createAdherenceService(supabase).fetchStudentAdherence("aluno-1", HOJE);

    expect(aderencia).toBe(50);
  });

  // O PRD pede treino + dieta combinados — nunca só um dos dois quando ambos existem.
  it("combina treino e dieta quando os dois planos estão ativos", async () => {
    const { supabase } = criarSupabaseFake([
      { data: { id: "periodizacao-1" } },
      { data: { id: "fase-1" } },
      { count: 4 },
      { count: 4 }, // 100% no treino
      {
        data: {
          plan_type: "unique",
          start_date: HOJE,
          meals: [{ id: "m1", day_of_week: null }],
        },
      },
      { data: [] }, // nenhuma refeição registrada — 0% na dieta
    ]);

    const aderencia = await createAdherenceService(supabase).fetchStudentAdherence("aluno-1", HOJE);

    expect(aderencia).toBe(50); // média de 100% e 0%
  });

  it("devolve null para aluno sem treino e sem dieta ativos, nunca 0%", async () => {
    const { supabase } = criarSupabaseFake([{ data: null }, { data: null }]);

    expect(
      await createAdherenceService(supabase).fetchStudentAdherence("aluno-2", HOJE),
    ).toBeNull();
  });

  // Fase planejada mas ainda não iniciada não deveria contar como treino
  // prescrito — mesma regra de "sem plano ativo" do lado da dieta.
  it("não conta periodização sem fase ativa como treino prescrito", async () => {
    const { supabase } = criarSupabaseFake([
      { data: { id: "periodizacao-1" } },
      { data: null }, // nenhuma fase com status active
      { data: null }, // sem plano de dieta também
    ]);

    expect(
      await createAdherenceService(supabase).fetchStudentAdherence("aluno-3", HOJE),
    ).toBeNull();
  });
});

describe("adherenceService.fetchAdherence", () => {
  it("devolve null quando o especialista não tem aluno ativo", async () => {
    const { supabase } = criarSupabaseFake([{ data: [] }]);

    expect(await createAdherenceService(supabase).fetchAdherence("especialista-1", HOJE)).toBe(
      null,
    );
  });

  // Aluno sem treino nem dieta ativos não pode puxar a média para baixo como
  // se tivesse 0% — ele simplesmente não entra na conta.
  it("ignora alunos sem nenhum plano ativo na média", async () => {
    const { supabase } = criarSupabaseFake([
      { data: [{ student_id: "aluno-1" }, { student_id: "aluno-2" }] },
      // aluno-1: só treino, 100%
      { data: { id: "periodizacao-1" } },
      { data: { id: "fase-1" } },
      { count: 2 },
      { count: 2 },
      { data: null },
      // aluno-2: sem treino nem dieta
      { data: null },
      { data: null },
    ]);

    expect(await createAdherenceService(supabase).fetchAdherence("especialista-1", HOJE)).toBe(100);
  });
});

describe("adherenceService — travas de LGPD (issue #332)", () => {
  // Art. 6°, III: `diet_logs` é campo legado (docs/LGPD_COMPLIANCE.md), já
  // superado por `meal_logs`. Reintroduzir a leitura dele aqui reviveria uma
  // fonte de dado que o produto já abandonou.
  it("nunca consulta a tabela diet_logs", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "periodizacao-1" } },
      { data: { id: "fase-1" } },
      { count: 4 },
      { count: 3 },
      {
        data: {
          plan_type: "unique",
          start_date: HOJE,
          meals: [{ id: "m1", day_of_week: null }],
        },
      },
      { data: [{ logged_date: HOJE, diet_meal_id: "m1", completed: true }] },
    ]);

    await createAdherenceService(supabase).fetchStudentAdherence("aluno-1", HOJE);

    expect(chamadas.some((c) => c.tabela === "diet_logs")).toBe(false);
    expect(chamadas.some((c) => c.tabela === "meal_logs")).toBe(true);
  });

  // A RLS de `meal_logs` fecha o acesso do especialista quando o aluno
  // revoga o consentimento de saúde (migration 0043) — mas só se quem
  // consulta for a sessão do próprio especialista. Rodar como `service_role`
  // ignora RLS por definição e reabriria o acesso que aquela migration
  // fechou.
  //
  // Isso não é testável com o fake (ele não simula RLS), e uma varredura do
  // código-fonte por `import.meta.url` se mostrou frágil: quebra quando este
  // arquivo é carregado pelo runner do `web/`, que não preserva uma URL de
  // arquivo real entre pacotes do monorepo. A garantia real é de construção
  // — `createAdherenceService` só aceita o `SupabaseClient` que recebe por
  // parâmetro, nunca importa credencial de admin — verificada em revisão de
  // código, e a trava de RLS de verdade mora em scripts/verify-rls.sql,
  // contra o banco real.
});

describe("adherenceService — contrato de leitura do treino (regressão do wizard, issue #335)", () => {
  // O wizard de criação de treino (#335) publica pelos mesmos dois campos que
  // este serviço já lia: `activatePeriodization`/`activateTrainingPlan` viram
  // `status = 'active'`, e o passo de revisão grava `day_of_week` em cada
  // treino. Se qualquer um dos dois lados divergir do que está fixado aqui, a
  // aderência para de contar sessão prescrita sem ninguém perceber.
  it("lê periodização e fase pelo mesmo par tabela/status que o wizard publica", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "periodizacao-1" } },
      { data: { id: "fase-1" } },
      { count: 4 },
      { count: 3 },
    ]);

    await createAdherenceService(supabase).fetchStudentAdherence("aluno-1", HOJE);

    expect(chamadas[0].tabela).toBe("training_periodizations");
    expect(chamadas[0].select).toBe("id");
    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1", status: "active" });

    expect(chamadas[1].tabela).toBe("training_plans");
    expect(chamadas[1].select).toBe("id");
    expect(chamadas[1].filtros).toEqual({ periodization_id: "periodizacao-1", status: "active" });
  });

  it("conta como prescrito só o treino com day_of_week preenchido, na fase ativa", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "periodizacao-1" } },
      { data: { id: "fase-1" } },
      { count: 4 },
      { count: 3 },
    ]);

    await createAdherenceService(supabase).fetchStudentAdherence("aluno-1", HOJE);

    expect(chamadas[2].tabela).toBe("workouts");
    expect(chamadas[2].filtros).toEqual({ training_plan_id: "fase-1" });
    expect(chamadas[2].metodos).toContainEqual({
      nome: "not",
      args: ["day_of_week", "is", null],
    });
  });
});
