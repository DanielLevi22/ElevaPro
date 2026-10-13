import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockFetchStudentLinks = vi.fn();
const mockGenerateLinkCode = vi.fn();
const mockEndStudentLink = vi.fn();

vi.mock("@elevapro/shared", () => ({
  createStudentsService: () => ({
    fetchStudentLinks: mockFetchStudentLinks,
    generateLinkCode: mockGenerateLinkCode,
    endStudentLink: mockEndStudentLink,
  }),
  createLinkCodeService: () => ({ redeem: vi.fn(), generate: vi.fn() }),
}));

vi.mock("@elevapro/supabase", () => ({ supabase: {} }));

const { useStudentLinks, useGenerateLinkCode, useEndStudentLink } = await import(
  "../hooks/useStudentLinks"
);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe("useStudentLinks", () => {
  it("does not fetch when studentId is null", () => {
    const { result } = renderHook(() => useStudentLinks(null), { wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(mockFetchStudentLinks).not.toHaveBeenCalled();
  });

  it("returns mapped specialist links on success", async () => {
    mockFetchStudentLinks.mockResolvedValueOnce([
      {
        id: "link-1",
        specialist_id: "spec-1",
        service_type: "personal_training",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        profiles: [{ full_name: "João Trainer" }],
      },
    ]);

    const { result } = renderHook(() => useStudentLinks("student-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchStudentLinks).toHaveBeenCalledWith("student-1");
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({
      id: "link-1",
      service_type: "personal_training",
      specialist_name: "João Trainer",
    });
  });

  it("handles non-array profiles shape", async () => {
    mockFetchStudentLinks.mockResolvedValueOnce([
      {
        id: "link-2",
        specialist_id: "spec-2",
        service_type: "nutrition_consulting",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        profiles: { full_name: "Maria Nutri" },
      },
    ]);

    const { result } = renderHook(() => useStudentLinks("student-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].specialist_name).toBe("Maria Nutri");
  });

  it("returns null specialist_name when profiles is null", async () => {
    mockFetchStudentLinks.mockResolvedValueOnce([
      {
        id: "link-3",
        specialist_id: "spec-3",
        service_type: "personal_training",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        profiles: null,
      },
    ]);

    const { result } = renderHook(() => useStudentLinks("student-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].specialist_name).toBeNull();
  });

  it("throws on service error", async () => {
    mockFetchStudentLinks.mockRejectedValueOnce(new Error("DB error"));

    const { result } = renderHook(() => useStudentLinks("student-1"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("DB error");
  });
});

// ---------------------------------------------------------------------------
describe("useGenerateLinkCode", () => {
  it("calls generateLinkCode and returns the code", async () => {
    mockGenerateLinkCode.mockResolvedValueOnce("ABC123");

    const { result } = renderHook(() => useGenerateLinkCode("student-1"), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGenerateLinkCode).toHaveBeenCalledWith("student-1");
    expect(result.current.data).toBe("ABC123");
  });

  it("throws when studentId is null", async () => {
    const { result } = renderHook(() => useGenerateLinkCode(null), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Usuário não autenticado");
    expect(mockGenerateLinkCode).not.toHaveBeenCalled();
  });

  it("propagates service errors", async () => {
    mockGenerateLinkCode.mockRejectedValueOnce(new Error("Delete failed"));

    const { result } = renderHook(() => useGenerateLinkCode("student-1"), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Delete failed");
  });
});

// ---------------------------------------------------------------------------
describe("useEndStudentLink", () => {
  it("calls endStudentLink with correct args and succeeds", async () => {
    mockEndStudentLink.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useEndStudentLink(), { wrapper });
    result.current.mutate({ linkId: "link-1", studentId: "student-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEndStudentLink).toHaveBeenCalledWith("link-1", "student-1");
  });

  it("throws on service error", async () => {
    mockEndStudentLink.mockRejectedValueOnce(new Error("RLS violation"));

    const { result } = renderHook(() => useEndStudentLink(), { wrapper });
    result.current.mutate({ linkId: "bad-link", studentId: "student-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("RLS violation");
  });
});
