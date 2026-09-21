import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockResendInvite = vi.fn();

vi.mock("@elevapro/supabase", () => ({ supabase: {} }));
vi.mock("@elevapro/shared", () => ({
  createStudentsService: () => ({ resendInvite: mockResendInvite }),
}));

const { useResendInvite } = await import("../hooks/useResendInvite");

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe("useResendInvite", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reenvia o convite pelo serviço compartilhado", async () => {
    mockResendInvite.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useResendInvite(), { wrapper });
    result.current.mutate("student-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockResendInvite).toHaveBeenCalledWith("student-1");
  });

  it("lança erro quando o serviço recusa", async () => {
    mockResendInvite.mockResolvedValueOnce({
      success: false,
      error: "Este aluno já aceitou o convite.",
    });

    const { result } = renderHook(() => useResendInvite(), { wrapper });
    result.current.mutate("student-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Este aluno já aceitou o convite.");
  });
});
