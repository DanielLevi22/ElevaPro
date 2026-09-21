import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createAdherenceService } from "../adherence.service";

const HOJE = "2026-09-21";

describe("adherenceService.fetchStudentAdherence", () => {
  // A mesma regra que o aluno já vê no próprio hub de Progresso (#298):
  // refeições feitas sobre planejadas. Reaproveitada aqui, não recalculada —
  // "aderência" não pode significar duas contas diferentes no mesmo produto.
  it("calcula a mesma aderência que o hub do aluno mostraria", async () => {
    const { supabase } = criarSupabaseFake([
      // getMealPlanOutline: diet_plans + diet_meals. `unique` vale todo dia
      // desde o início — com `start_date` igual a hoje, só hoje entra na
      // janela de 30 dias, o que torna a conta previsível no teste.
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
      // meal_logs do dia de hoje
      {
        data: [{ logged_date: HOJE, diet_meal_id: "m1", completed: true }],
      },
    ]);

    const aderencia = await createAdherenceService(supabase).fetchStudentAdherence("aluno-1", HOJE);

    expect(aderencia).toBe(50);
  });

  it("devolve null para aluno sem plano de dieta ativo, nunca 0%", async () => {
    const { supabase } = criarSupabaseFake([{ data: null }, { data: [] }]);

    expect(
      await createAdherenceService(supabase).fetchStudentAdherence("aluno-2", HOJE),
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

  // Aluno sem plano ativo não pode puxar a média para baixo como se tivesse
  // 0% — ele simplesmente não entra na conta.
  it("ignora alunos sem plano de dieta ativo na média", async () => {
    const { supabase } = criarSupabaseFake([
      { data: [{ student_id: "aluno-1" }, { student_id: "aluno-2" }] },
      // aluno-1: 100%
      { data: { plan_type: "unique", start_date: HOJE, meals: [{ id: "m1", day_of_week: null }] } },
      { data: [{ logged_date: HOJE, diet_meal_id: "m1", completed: true }] },
      // aluno-2: sem plano
      { data: null },
      { data: [] },
    ]);

    expect(await createAdherenceService(supabase).fetchAdherence("especialista-1", HOJE)).toBe(100);
  });
});
