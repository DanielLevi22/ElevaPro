import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace, hasCurrentPrivilegedProof, initialize, signInWithPasskey, authSnapshot } =
  vi.hoisted(() => ({
    replace: vi.fn(),
    hasCurrentPrivilegedProof: vi.fn(),
    initialize: vi.fn(),
    signInWithPasskey: vi.fn(),
    authSnapshot: {
      user: { id: "user-1" } as { id: string } | null,
      accountType: "specialist" as "specialist" | "admin" | "student" | null,
      isLoading: false,
    },
  }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("@/modules/auth", () => ({
  hasCurrentPrivilegedProof,
  signInWithPasskey,
  isPasskeyEnabled: () => true,
  useAuthStore: Object.assign(
    (selector: (state: typeof authSnapshot) => unknown) => selector(authSnapshot),
    { getState: () => ({ initialize }) },
  ),
}));

import LoginPage from "./page";

describe("retorno à tela de login com sessão restaurada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSnapshot.user = { id: "user-1" };
    authSnapshot.accountType = "specialist";
    authSnapshot.isLoading = false;
    hasCurrentPrivilegedProof.mockResolvedValue(true);
  });

  it("leva o especialista com sessão aal2 de volta ao painel sem pedir senha", async () => {
    render(<LoginPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("mantém o segundo fator obrigatório quando a sessão restaurada está em aal1", async () => {
    hasCurrentPrivilegedProof.mockResolvedValue(false);
    render(<LoginPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/mfa"));
  });

  it("exige a segunda etapa quando não consegue conferir o nível da sessão", async () => {
    hasCurrentPrivilegedProof.mockRejectedValue(new Error("rede indisponível"));
    render(<LoginPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/mfa"));
  });

  it("oferece nova leitura do perfil sem pedir senha quando a sessão ainda existe", async () => {
    authSnapshot.accountType = null;
    render(<LoginPage />);

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(initialize).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
  });

  it("oferece login por Face ID/PIN quando não há sessão", async () => {
    authSnapshot.user = null;
    authSnapshot.accountType = null;
    signInWithPasskey.mockResolvedValue(undefined);
    render(<LoginPage />);

    await userEvent.click(
      screen.getByRole("button", { name: "Entrar com Face ID ou PIN do aparelho" }),
    );

    expect(signInWithPasskey).toHaveBeenCalledOnce();
  });
});
