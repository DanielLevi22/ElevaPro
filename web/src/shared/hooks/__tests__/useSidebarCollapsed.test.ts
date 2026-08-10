import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSidebarCollapsed } from "../useSidebarCollapsed";

const STORAGE_KEY = "elevapro:sidebar-collapsed";

describe("useSidebarCollapsed", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("começa expandido quando não há preferência salva", () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.isCollapsed).toBe(false);
  });

  it("restaura a preferência salva", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.isCollapsed).toBe(true);
  });

  it("alterna e persiste", () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => result.current.toggle());
    expect(result.current.isCollapsed).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("alternar duas vezes volta ao estado inicial", () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.isCollapsed).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
  });

  // O servidor não conhece a preferência: ler o localStorage durante o render
  // divergiria do HTML entregue. Por isso o valor salvo só entra após o efeito.
  it("sinaliza a hidratação depois de ler a preferência", () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.isHydrated).toBe(true);
  });
});
