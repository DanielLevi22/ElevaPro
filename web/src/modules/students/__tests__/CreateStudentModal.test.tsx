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

const { CreateStudentModal } = await import("../components/CreateStudentModal");

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return React.createElement(QueryClientProvider, { client }, children);
}

describe("CreateStudentModal", () => {
  beforeEach(() => {
    mockMutateAsync.mockResolvedValue({ success: true, student_id: "abc" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    render(<CreateStudentModal isOpen={false} onClose={vi.fn()} />, { wrapper });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders form when open", () => {
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome Completo")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });

  it("submits with correct values", async () => {
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });

    await userEvent.type(screen.getByLabelText("Nome Completo"), "João Silva");
    await userEvent.type(screen.getByLabelText("Email"), "joao@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "Senha@123");
    await userEvent.click(screen.getByRole("button", { name: "Criar Aluno" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "João Silva",
          email: "joao@example.com",
          password: "Senha@123",
        }),
      ),
    );
  });

  it("shows success state after creation", async () => {
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });

    await userEvent.type(screen.getByLabelText("Nome Completo"), "Maria");
    await userEvent.type(screen.getByLabelText("Email"), "maria@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "Senha@123");
    await userEvent.click(screen.getByRole("button", { name: "Criar Aluno" }));

    await waitFor(() =>
      expect(screen.getByText(/foi cadastrado com sucesso/i)).toBeInTheDocument(),
    );
  });

  it("shows error message on failure", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Email já cadastrado"));
    render(<CreateStudentModal isOpen={true} onClose={vi.fn()} />, { wrapper });

    await userEvent.type(screen.getByLabelText("Nome Completo"), "Pedro");
    await userEvent.type(screen.getByLabelText("Email"), "pedro@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "Senha@123");
    await userEvent.click(screen.getByRole("button", { name: "Criar Aluno" }));

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
