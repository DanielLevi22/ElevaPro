import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMutateAsync = vi.fn();
const mockReset = vi.fn();

vi.mock("../hooks/useCreateStudent", () => ({
  useCreateStudent: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    reset: mockReset,
  }),
}));

const mockAuthState = {
  user: { id: "specialist-1" },
  services: ["personal_training", "nutrition_consulting"],
};
vi.mock("@/modules/auth", () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));

const { CreateStudentModal } = await import("../components/CreateStudentModal");

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return React.createElement(QueryClientProvider, { client }, children);
}

describe("CreateStudentModal", () => {
  beforeEach(() => {
    mockMutateAsync.mockResolvedValue({ success: true, student_id: "abc" });
    mockAuthState.services = ["personal_training", "nutrition_consulting"];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    render(<CreateStudentModal isOpen={false} onClose={vi.fn()} />, { wrapper });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ADR-0035: nunca mais um campo de senha no cadastro pelo especialista.
  it("renders form without a password field", () => {
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome Completo")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    expect(screen.getByText("Treino")).toBeInTheDocument();
    expect(screen.getByText("Nutrição")).toBeInTheDocument();
  });

  // O seletor só pode oferecer o que o especialista logado presta.
  it("só mostra o tipo de serviço que o especialista oferece", () => {
    mockAuthState.services = ["personal_training"];
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText("Treino")).toBeInTheDocument();
    expect(screen.queryByText("Nutrição")).not.toBeInTheDocument();
  });

  it("submits with the chosen service types, never a password", async () => {
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });

    await userEvent.type(screen.getByLabelText("Nome Completo"), "João Silva");
    await userEvent.type(screen.getByLabelText("Email"), "joao@example.com");
    await userEvent.click(screen.getByText("Treino"));
    await userEvent.click(screen.getByRole("button", { name: "Enviar Convite" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        specialistId: "specialist-1",
        fullName: "João Silva",
        email: "joao@example.com",
        serviceTypes: ["personal_training"],
      }),
    );
  });

  it("impede o envio sem nenhum tipo de acompanhamento selecionado", async () => {
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });

    await userEvent.type(screen.getByLabelText("Nome Completo"), "João Silva");
    await userEvent.type(screen.getByLabelText("Email"), "joao@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar Convite" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Selecione pelo menos um tipo de acompanhamento.",
    );
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("shows success state after creation", async () => {
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });

    await userEvent.type(screen.getByLabelText("Nome Completo"), "Maria");
    await userEvent.type(screen.getByLabelText("Email"), "maria@example.com");
    await userEvent.click(screen.getByText("Treino"));
    await userEvent.click(screen.getByRole("button", { name: "Enviar Convite" }));

    await waitFor(() => expect(screen.getByText(/recebeu o convite/i)).toBeInTheDocument());
  });

  it("shows error message on failure", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Email já cadastrado"));
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });

    await userEvent.type(screen.getByLabelText("Nome Completo"), "Pedro");
    await userEvent.type(screen.getByLabelText("Email"), "pedro@example.com");
    await userEvent.click(screen.getByText("Treino"));
    await userEvent.click(screen.getByRole("button", { name: "Enviar Convite" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Este e-mail já possui uma conta."),
    );
  });

  it("calls onClose when cancel is clicked", async () => {
    const onClose = vi.fn();
    render(<CreateStudentModal isOpen={true} onClose={onClose} />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
