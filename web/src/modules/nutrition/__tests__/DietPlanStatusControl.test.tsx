import type { DietPlan } from "@elevapro/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DietPlanStatusControl } from "@/modules/nutrition/components/DietPlanStatusControl";

const activate = vi.fn();
const finish = vi.fn();

vi.mock("@/shared/hooks/useNutrition", () => ({
  useActivateDietPlan: () => ({ mutateAsync: activate, isPending: false }),
  useFinishDietPlan: () => ({ mutateAsync: finish, isPending: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makePlan(overrides: Partial<DietPlan> = {}): DietPlan {
  return {
    id: "plan-1",
    student_id: "student-1",
    specialist_id: "spec-1",
    name: "Cutting",
    plan_type: "unique",
    status: "draft",
    version: 1,
    start_date: "2026-10-01",
    end_date: "2026-11-01",
    target_calories: 2200,
    target_protein: 165,
    target_carbs: 220,
    target_fat: 73,
    notes: null,
    dietary_restrictions: [],
    meals_per_day: null,
    allows_supplements: null,
    free_meal_days: [],
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

describe("DietPlanStatusControl", () => {
  beforeEach(() => {
    activate.mockReset();
    finish.mockReset();
  });

  // O rascunho não vale até ser enviado: o botão é o único caminho até o aluno.
  it("rascunho do especialista mostra o selo e envia para o aluno", async () => {
    render(<DietPlanStatusControl dietPlan={makePlan()} />);

    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar para o aluno" }));

    expect(activate).toHaveBeenCalledWith("plan-1");
  });

  it("rascunho do próprio Praticante é ativado, não enviado", () => {
    render(<DietPlanStatusControl dietPlan={makePlan({ specialist_id: null })} />);

    expect(screen.getByRole("button", { name: "Ativar plano" })).toBeInTheDocument();
  });

  it("plano ativo finaliza depois da confirmação", async () => {
    render(<DietPlanStatusControl dietPlan={makePlan({ status: "active" })} />);

    await userEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    expect(finish).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Finalizar plano" }));

    expect(finish).toHaveBeenCalledWith("plan-1");
  });

  // Voltar um plano finalizado a ativo por status deixaria dois planos valendo.
  it("plano finalizado não oferece ação nenhuma", () => {
    render(<DietPlanStatusControl dietPlan={makePlan({ status: "finished" })} />);

    expect(screen.getByText("Finalizado")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
