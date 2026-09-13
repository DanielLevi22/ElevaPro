import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();

vi.mock("@elevapro/supabase", () => ({
  supabase: { auth: { getSession: mockGetSession } },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { useStudentActivities } = await import("../hooks/useStudentActivities");

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

const DIA = {
  date: "2026-08-28",
  summary: null,
  events: [
    {
      id: "session-1",
      kind: "workout",
      author: "student",
      at: "2026-08-28T11:00:00Z",
      title: "Treino A",
      detail: null,
      pse: 8,
      studentNote: "senti dor no ombro",
    },
  ],
};

describe("useStudentActivities", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "token-abc" } } });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ days: [DIA] }) });
  });

  // A rota agrega sete tabelas sensíveis com `service_role`, que ignora RLS. Sem
  // o token, `authorizeLinkedSpecialist` não tem o que checar — e é ela a única
  // barreira ali.
  it("manda o token do especialista no Authorization", async () => {
    const { result } = renderHook(() => useStudentActivities("aluno-1", "student"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer token-abc");
  });

  // O filtro é do servidor, não do cliente: mandar a autoria na query é o que
  // impede o navegador de receber eventos que ele vai esconder.
  it("passa a autoria escolhida para a rota", async () => {
    const { result } = renderHook(() => useStudentActivities("aluno-1", "specialist"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe("/api/students/aluno-1/activities?author=specialist");
  });

  it("devolve os dias já agrupados pelo servidor", async () => {
    const { result } = renderHook(() => useStudentActivities("aluno-1", "student"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([DIA]);
  });

  // Sem aluno não há o que buscar — e uma chamada com `null` na URL viraria 404
  // no servidor em vez de erro visível aqui.
  it("não consulta quando não há aluno", () => {
    renderHook(() => useStudentActivities(null, "student"), { wrapper });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Erro da rota tem de chegar como erro, não como lista vazia: "sem atividade"
  // e "não consegui carregar" levam a conclusões opostas sobre o aluno.
  it("propaga o erro da rota em vez de devolver lista vazia", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Sem vínculo ativo com este aluno." }),
    });

    const { result } = renderHook(() => useStudentActivities("aluno-1", "student"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Sem vínculo ativo com este aluno.");
  });
});
