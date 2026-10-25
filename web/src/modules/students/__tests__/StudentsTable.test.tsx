import type { Student } from "@elevapro/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMutate = vi.fn();
let mockPending = false;

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));
// O hook é a fronteira com o BFF; o teste dele cobre a chamada.
vi.mock("../hooks/useResendInvite", () => ({
  useResendInvite: () => ({ mutate: mockMutate, isPending: mockPending }),
}));

const { StudentsTable } = await import("../components/StudentsTable");

function student(overrides: Partial<Student>): Student {
  return {
    id: "aluno-1",
    full_name: "Jaque",
    email: "jaque@email.com",
    account_status: "invited",
    ...overrides,
  } as Student;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPending = false;
});

describe("reenviar convite na lista de alunos", () => {
  it("aluno pendente tem o botão escrito, e o ativo não", () => {
    render(
      <StudentsTable
        students={[
          student({}),
          student({ id: "aluno-2", full_name: "Ana", account_status: "active" }),
        ]}
      />,
    );

    expect(screen.getAllByText("Reenviar convite")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Reenviar convite para Jaque" })).toBeEnabled();
  });

  it("confirma o envio em toast, com o e-mail de destino", async () => {
    mockMutate.mockImplementation((_id, { onSuccess }) => onSuccess());
    render(<StudentsTable students={[student({})]} />);

    await userEvent.click(screen.getByRole("button", { name: "Reenviar convite para Jaque" }));

    expect(mockMutate).toHaveBeenCalledWith("aluno-1", expect.any(Object));
    expect(toast.success).toHaveBeenCalledWith("Convite reenviado para jaque@email.com.");
  });

  it("falha aparece em toast com a mensagem do serviço", async () => {
    mockMutate.mockImplementation((_id, { onError }) =>
      onError(new Error("Não foi possível reenviar o convite")),
    );
    render(<StudentsTable students={[student({})]} />);

    await userEvent.click(screen.getByRole("button", { name: "Reenviar convite para Jaque" }));

    expect(toast.error).toHaveBeenCalledWith("Não foi possível reenviar o convite");
  });

  it("enquanto envia, diz que está enviando e não aceita outro clique", () => {
    mockPending = true;
    render(<StudentsTable students={[student({})]} />);

    expect(screen.getByRole("button", { name: "Reenviar convite para Jaque" })).toBeDisabled();
    expect(screen.getByText("Enviando...")).toBeTruthy();
  });
});
