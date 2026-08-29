import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMutateAsync = vi.fn();

vi.mock("../hooks/useCreateAssessment", () => ({
  useCreateAssessment: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const { AssessmentModal } = await import("../components/AssessmentModal");

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return React.createElement(QueryClientProvider, { client }, children);
}

describe("AssessmentModal", () => {
  beforeEach(() => {
    mockMutateAsync.mockResolvedValue({ id: "a-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when studentId is null", () => {
    render(<AssessmentModal studentId={null} onClose={vi.fn()} />, { wrapper });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders with composicao tab active by default", () => {
    render(<AssessmentModal studentId="student-1" onClose={vi.fn()} />, { wrapper });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/peso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/altura/i)).toBeInTheDocument();
  });

  it("shows all three tabs", () => {
    render(<AssessmentModal studentId="student-1" onClose={vi.fn()} />, { wrapper });
    expect(screen.getByRole("button", { name: "Composição" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Circunferências" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dobras" })).toBeInTheDocument();
  });

  it("shows circumference fields when tab is switched", async () => {
    render(<AssessmentModal studentId="student-1" onClose={vi.fn()} />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Circunferências" }));
    await waitFor(() => expect(screen.getByLabelText(/cintura/i)).toBeInTheDocument());
  });

  it("shows skinfold fields when dobras tab is active", async () => {
    render(<AssessmentModal studentId="student-1" onClose={vi.fn()} />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Dobras" }));
    await waitFor(() => expect(screen.getByLabelText(/peitoral/i)).toBeInTheDocument());
  });

  it("shows bmi preview when weight and height are filled", async () => {
    render(<AssessmentModal studentId="student-1" onClose={vi.fn()} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/peso/i), "75");
    await userEvent.type(screen.getByLabelText(/altura/i), "175");
    await waitFor(() =>
      expect(screen.getByText(/imc calculado automaticamente/i)).toBeInTheDocument(),
    );
  });

  it("calls mutateAsync on submit", async () => {
    render(<AssessmentModal studentId="student-1" onClose={vi.fn()} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/peso/i), "75");
    // A altura passou a ser obrigatória junto com o peso: os dois formam a
    // Escala do body scan, e a rota recusa com 422 sem eles.
    await userEvent.type(screen.getByLabelText(/altura/i), "175");
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: "student-1", weight: 75 }),
      ),
    );
  });

  it("shows error message on failure", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Erro ao salvar avaliação"));
    render(<AssessmentModal studentId="student-1" onClose={vi.fn()} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/peso/i), "75");
    await userEvent.type(screen.getByLabelText(/altura/i), "175");
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Erro ao salvar avaliação"),
    );
  });

  it("calls onClose when cancel is clicked", async () => {
    const onClose = vi.fn();
    render(<AssessmentModal studentId="student-1" onClose={onClose} />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Altura e peso são a Escala que calibra o body scan do aluno. Sem eles a
  // avaliação não serve de fonte, e antes desta trava ela era gravada assim
  // mesmo — o aluno descobria três telas depois, barrado na análise com um
  // "tente de novo" que nunca podia funcionar.
  it("não grava avaliação sem a escala, e diz por quê", async () => {
    render(<AssessmentModal studentId="student-1" onClose={vi.fn()} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/peso/i), "75");
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/obrigatórios/i));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
