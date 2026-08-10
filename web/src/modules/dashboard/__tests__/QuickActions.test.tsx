import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickActions } from "../components/QuickActions";

describe("QuickActions", () => {
  it("leva cada acao para a rota correspondente", () => {
    render(<QuickActions />);
    expect(screen.getByRole("link", { name: /Adicionar Aluno/ })).toHaveAttribute(
      "href",
      "/dashboard/students",
    );
    expect(screen.getByRole("link", { name: /Criar Treino/ })).toHaveAttribute(
      "href",
      "/dashboard/workouts",
    );
  });

  // Regressao: "Criar Dieta" apontava para a listagem, nao para a criacao.
  it("Criar Dieta abre o formulario de criacao", () => {
    render(<QuickActions />);
    expect(screen.getByRole("link", { name: /Criar Dieta/ })).toHaveAttribute(
      "href",
      "/dashboard/diets/new",
    );
  });

  // Regressao: "Ver Relatorios" apontava para /dashboard, a propria pagina.
  // Nao existe rota de relatorios no produto.
  it("nao oferece acao sem destino", () => {
    render(<QuickActions />);
    expect(screen.queryByRole("link", { name: /Relat/ })).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("/dashboard");
    }
  });
});
