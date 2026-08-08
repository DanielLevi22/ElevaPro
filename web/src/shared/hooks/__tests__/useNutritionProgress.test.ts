import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Encadeamento do PostgREST: cada filtro devolve o próprio builder, e o await
// no final resolve. `order` é o último elo antes do await neste hook.
const rows: Array<{ assessed_at: string; weight_kg: string | null }> = [];

const builder: Record<string, unknown> = {};
const chain = () => builder;

builder.select = vi.fn(chain);
builder.eq = vi.fn(chain);
builder.not = vi.fn(chain);
builder.gte = vi.fn(chain);
builder.lte = vi.fn(chain);
builder.limit = vi.fn(chain);
builder.maybeSingle = vi.fn(async () => ({ data: rows[0] ?? null, error: null }));
builder.order = vi.fn(() => ({
  ...builder,
  // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
  then: (resolve: (value: unknown) => unknown) => resolve({ data: rows, error: null }),
}));

const mockFrom = vi.fn(() => builder);

vi.mock("@elevapro/supabase", () => ({
  supabase: { from: mockFrom },
}));

const { useNutritionProgress } = await import("../useNutrition");

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  rows.length = 0;
});

describe("useNutritionProgress", () => {
  // Regressão: o hook lia de `nutrition_progress`, tabela que nunca existiu no
  // banco. O gráfico de peso vinha sempre vazio e ninguém percebia, porque o
  // erro do PostgREST era engolido pelo estado de loading do React Query.
  it("lê de physical_assessments, não de nutrition_progress", async () => {
    const { result } = renderHook(() => useNutritionProgress("student-1"), { wrapper });

    await waitFor(() => expect(mockFrom).toHaveBeenCalled());
    expect(mockFrom).toHaveBeenCalledWith("physical_assessments");
    expect(mockFrom).not.toHaveBeenCalledWith("nutrition_progress");
    expect(result.current).toBeDefined();
  });

  // O contrato de retorno foi mantido de propósito para os consumidores
  // (ProgressCharts) não mudarem — só a fonte trocou.
  it("mapeia assessed_at/weight_kg para o contrato recorded_date/weight", async () => {
    rows.push({ assessed_at: "2026-07-01", weight_kg: "82.50" });

    const { result } = renderHook(() => useNutritionProgress("student-1"), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.[0]).toEqual({ recorded_date: "2026-07-01", weight: 82.5 });
  });

  it("não consulta enquanto não houver aluno", () => {
    renderHook(() => useNutritionProgress(""), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
