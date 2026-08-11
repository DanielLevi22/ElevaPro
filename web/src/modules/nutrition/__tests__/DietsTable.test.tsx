import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type DietPlanWithStudent, DietsTable } from "@/modules/nutrition/components/DietsTable";

function makePlan(overrides: Partial<DietPlanWithStudent> = {}): DietPlanWithStudent {
  return {
    id: "plan-1",
    student_id: "student-1",
    specialist_id: "spec-1",
    name: "Cutting Fase 2",
    plan_type: "unique",
    status: "active",
    version: 1,
    start_date: "2026-08-01",
    end_date: "2026-09-01",
    target_calories: 2400,
    target_protein: 180,
    target_carbs: 240,
    target_fat: 70,
    notes: null,
    created_at: "2026-08-01T00:00:00Z",
    student: { id: "student-1", full_name: "João Silva" },
    ...overrides,
  };
}

describe("DietsTable", () => {
  it("mostra nome do plano, macros e período", () => {
    render(<DietsTable dietPlans={[makePlan()]} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Cutting Fase 2")).toBeInTheDocument();
    expect(screen.getByText("2400 kcal · P180 C240 G70")).toBeInTheDocument();
  });

  // Regressão: DietCard lia `profiles?.full_name` com cast `as any`, mas o
  // service anexa o perfil como `student` — o nome do aluno nunca renderizava.
  it("lê o nome do aluno do campo que o service realmente devolve", () => {
    render(<DietsTable dietPlans={[makePlan()]} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("plano sem aluno associado não quebra a linha", () => {
    render(
      <DietsTable
        dietPlans={[makePlan({ student: undefined })]}
        onView={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Aluno sem nome")).toBeInTheDocument();
  });

  it.each([
    ["active" as const, "Ativo"],
    ["finished" as const, "Finalizado"],
  ])("traduz o status %s", (status, expected) => {
    render(<DietsTable dietPlans={[makePlan({ status })]} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    ["unique" as const, "Única"],
    ["cyclic" as const, "Cíclica"],
  ])("traduz o tipo %s", (planType, expected) => {
    render(
      <DietsTable
        dietPlans={[makePlan({ plan_type: planType })]}
        onView={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  // Regressão: `new Date("2026-08-01")` é lido como UTC. Formatado em fuso
  // negativo (BRT = UTC-3), exibia 31 de julho — todo período um dia atrasado.
  it("não desloca a data por causa do fuso", () => {
    render(<DietsTable dietPlans={[makePlan()]} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("1 ago → 1 set")).toBeInTheDocument();
  });

  // Regressão: o format do date-fns lança com data inválida, e o banco tem
  // registros com ano fora de faixa. Uma linha ruim derrubava a tabela toda.
  it("data corrompida no banco não derruba a listagem", () => {
    expect(() =>
      render(
        <DietsTable
          dietPlans={[makePlan({ start_date: "12312-12-23" })]}
          onView={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });

  it("período incompleto vira travessão em vez de Invalid Date", () => {
    render(
      <DietsTable dietPlans={[makePlan({ end_date: null })]} onView={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it("clicar no plano abre os detalhes", async () => {
    const onView = vi.fn();
    render(<DietsTable dietPlans={[makePlan()]} onView={onView} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByText("Cutting Fase 2"));
    expect(onView).toHaveBeenCalledWith("plan-1");
  });

  // O botão de excluir fica dentro da linha clicável: sem parar a propagação,
  // excluir também navegaria para o plano.
  it("excluir não dispara a navegação", async () => {
    const onView = vi.fn();
    const onDelete = vi.fn();
    render(<DietsTable dietPlans={[makePlan()]} onView={onView} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: "Excluir Cutting Fase 2" }));
    expect(onDelete).toHaveBeenCalledWith("plan-1");
    expect(onView).not.toHaveBeenCalled();
  });
});
