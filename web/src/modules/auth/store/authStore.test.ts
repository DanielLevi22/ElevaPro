import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, getUserContextJWT, signOut } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserContextJWT: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@elevapro/shared", () => ({
  createAuthService: () => ({ getSession, signOut }),
}));
vi.mock("@elevapro/supabase", () => ({
  defineAbilitiesFor: vi.fn(),
  getUserContextJWT,
  supabase: { auth: { signOut } },
}));

import { useAuthStore } from "./authStore";

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ session: null, user: null, isLoading: true });
});

describe("sessão web", () => {
  // Uma falha de leitura do perfil não prova que o token expirou. Encerrar a
  // sessão aqui força novo login e MFA ao simplesmente reabrir a aba.
  it("não encerra uma sessão válida se o perfil falha temporariamente", async () => {
    const user = { id: "user-1" };
    const session = { user, access_token: "test-token" };
    getSession.mockResolvedValue({ data: { session } });
    getUserContextJWT.mockRejectedValue(new Error("database unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await useAuthStore.getState().initialize();

    expect(signOut).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      session,
      user,
      abilities: null,
      isLoading: false,
    });
    vi.restoreAllMocks();
  });

  it("recupera o contexto no próximo carregamento sem pedir novo login", async () => {
    const user = { id: "user-1" };
    const session = { user, access_token: "test-token" };
    getSession.mockResolvedValue({ data: { session } });
    getUserContextJWT
      .mockRejectedValueOnce(new Error("temporary connection error"))
      .mockResolvedValueOnce({ accountType: "student", accountStatus: "active" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await useAuthStore.getState().initialize();
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState()).toMatchObject({ session, user, accountType: "student" });
    expect(signOut).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("uma leitura atrasada que falha não apaga o contexto carregado por outra", async () => {
    const user = { id: "user-1" };
    const session = { user, access_token: "test-token" };
    let rejectFirst: (error: Error) => void = () => {};
    getUserContextJWT
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce({ accountType: "student", accountStatus: "active" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const first = useAuthStore.getState().updateSession(session as unknown as Session);
    await useAuthStore.getState().updateSession(session as unknown as Session);
    rejectFirst(new Error("temporary connection error"));
    await first;

    expect(useAuthStore.getState()).toMatchObject({ session, user, accountType: "student" });
    expect(signOut).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
