import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockCreateStudent = vi.fn();

vi.mock("@elevapro/supabase", () => ({ supabase: {} }));
vi.mock("@elevapro/shared", () => ({
  createStudentsService: () => ({ createStudent: mockCreateStudent }),
}));

// Import after mock
const { useCreateStudent } = await import("../hooks/useCreateStudent");

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe("useCreateStudent", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ADR-0035: o especialista convida, nunca define senha — o hook não aceita
  // mais esse campo, e delega pro mesmo serviço que o mobile usa (sem
  // duplicar a chamada ao BFF em dois lugares).
  it("convida o aluno pelo serviço compartilhado, sem senha", async () => {
    mockCreateStudent.mockResolvedValueOnce({ success: true, studentId: "student-456" });

    const { result } = renderHook(() => useCreateStudent(), { wrapper });

    result.current.mutate({
      specialistId: "specialist-1",
      fullName: "João Silva",
      email: "joao@example.com",
      serviceTypes: ["personal_training"],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreateStudent).toHaveBeenCalledWith({
      specialist_id: "specialist-1",
      full_name: "João Silva",
      email: "joao@example.com",
      service_types: ["personal_training"],
    });
    expect(result.current.data).toEqual({ success: true, student_id: "student-456" });
  });

  it("lança erro quando o serviço recusa", async () => {
    mockCreateStudent.mockResolvedValueOnce({ success: false, error: "Email já cadastrado" });

    const { result } = renderHook(() => useCreateStudent(), { wrapper });

    result.current.mutate({
      specialistId: "specialist-1",
      fullName: "Maria",
      email: "maria@example.com",
      serviceTypes: ["personal_training"],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Email já cadastrado");
  });

  it("lança mensagem padrão quando o serviço não devolve motivo", async () => {
    mockCreateStudent.mockResolvedValueOnce({ success: false });

    const { result } = renderHook(() => useCreateStudent(), { wrapper });

    result.current.mutate({
      specialistId: "specialist-1",
      fullName: "Pedro",
      email: "pedro@example.com",
      serviceTypes: ["personal_training"],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Não foi possível criar o aluno");
  });
});
