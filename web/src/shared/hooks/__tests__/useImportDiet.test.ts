import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  criarSupabaseFake,
  type SupabaseFake,
} from "../../../../../shared/src/services/__tests__/supabaseFake";

let database: SupabaseFake;
const getUser = vi.fn();
vi.mock("@elevapro/supabase", () => ({
  supabase: {
    auth: { getUser },
    from: (table: string) => database.supabase.from(table),
  },
}));
const { useImportDiet } = await import("../useNutrition");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useImportDiet", () => {
  it("cria o rascunho com o nome escolhido para o destino", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "especialista" } } });
    database = criarSupabaseFake([
      { data: { name: "Nome da origem", plan_type: "unique", target_calories: 2100 } },
      { data: { id: "copia", name: "Novo plano", status: "draft" } },
      { data: [] },
    ]);
    const { result } = renderHook(useImportDiet, { wrapper });

    const created = await result.current.mutateAsync({
      sourceDietPlanId: "origem",
      targetStudentId: "destino",
      name: "Novo plano",
    });

    expect(created).toMatchObject({ id: "copia", status: "draft" });
    expect(database.chamadas[1].payload).toMatchObject({
      student_id: "destino",
      specialist_id: "especialista",
      name: "Novo plano",
    });
  });

  it("recusa copiar sem uma sessão autenticada", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    database = criarSupabaseFake({});
    const { result } = renderHook(useImportDiet, { wrapper });

    await expect(
      result.current.mutateAsync({
        sourceDietPlanId: "origem",
        targetStudentId: "destino",
        name: "Novo plano",
      }),
    ).rejects.toThrow("Usuário não autenticado");
    expect(database.chamadas).toHaveLength(0);
  });
});
