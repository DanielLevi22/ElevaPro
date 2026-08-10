import type { Periodization } from "@elevapro/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeriodizationsTable } from "../components/PeriodizationsTable";

function makePeriodization(overrides: Partial<Periodization> = {}): Periodization {
  return {
    id: "p-1",
    name: "Ciclo Hipertrofia 2026",
    objective: "hypertrophy",
    status: "active",
    start_date: "2026-08-01",
    end_date: "2026-11-01",
    training_plans_count: 3,
    student: { id: "s-1", full_name: "João Silva" },
    ...overrides,
  } as Periodization;
}

describe("PeriodizationsTable", () => {
  it("liga cada linha ao detalhe da periodizacao", () => {
    render(<PeriodizationsTable periodizations={[makePeriodization()]} isMember={false} />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/dashboard/workouts/periodizations/p-1",
    );
  });

  it("traduz objetivo e status", () => {
    render(<PeriodizationsTable periodizations={[makePeriodization()]} isMember={false} />);
    expect(screen.getByText("Hipertrofia")).toBeInTheDocument();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
  });

  // parseISO em vez de `new Date`: a coluna e date-only e o construtor a leria
  // como UTC, exibindo o dia anterior em fuso negativo.
  it("nao desloca o periodo por causa do fuso", () => {
    render(<PeriodizationsTable periodizations={[makePeriodization()]} isMember={false} />);
    expect(screen.getByText("1 ago → 1 nov")).toBeInTheDocument();
  });

  it("pluraliza a contagem de fases", () => {
    render(
      <PeriodizationsTable
        periodizations={[
          makePeriodization({ id: "p-1", training_plans_count: 1 }),
          makePeriodization({ id: "p-2", training_plans_count: 3 }),
        ]}
        isMember={false}
      />,
    );
    expect(screen.getByText("1 fase")).toBeInTheDocument();
    expect(screen.getByText("3 fases")).toBeInTheDocument();
  });

  // O aluno ve os proprios ciclos: repetir o nome dele em toda linha e ruido.
  it("esconde o nome do aluno na visao do proprio aluno", () => {
    render(<PeriodizationsTable periodizations={[makePeriodization()]} isMember />);
    expect(screen.queryByText("João Silva")).not.toBeInTheDocument();
  });

  it("mostra o aluno na visao do especialista", () => {
    render(<PeriodizationsTable periodizations={[makePeriodization()]} isMember={false} />);
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("periodo incompleto nao vira Invalid Date", () => {
    render(
      <PeriodizationsTable
        periodizations={[makePeriodization({ start_date: null, end_date: null })]}
        isMember={false}
      />,
    );
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });
});
