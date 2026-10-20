import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  replace,
  push,
  hasCurrentPrivilegedProof,
  initialize,
  signIn,
  signInWithPasskey,
  authSnapshot,
} = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  hasCurrentPrivilegedProof: vi.fn(),
  initialize: vi.fn(),
  signIn: vi.fn(),
  signInWithPasskey: vi.fn(),
  authSnapshot: {
    user: { id: "user-1" } as { id: string } | null,
    accountType: "specialist" as "specialist" | "admin" | "student" | null,
    isLoading: false,
  },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));
vi.mock("@/modules/auth", () => ({
  hasCurrentPrivilegedProof,
  signInWithPasskey,
  isPasskeyEnabled: () => true,
  useAuthStore: Object.assign(
    (selector: (state: typeof authSnapshot) => unknown) => selector(authSnapshot),
    { getState: () => ({ initialize, signIn }) },
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

  // ADR-0047: o especialista entra por senha, sem passar pela tela do QR code.
  it("leva o especialista com sessão aal1 ao painel sem pedir segundo fator", async () => {
    hasCurrentPrivilegedProof.mockResolvedValue(false);
    render(<LoginPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(replace).not.toHaveBeenCalledWith("/auth/mfa");
  });

  it("mantém o segundo fator do admin quando a sessão restaurada está em aal1", async () => {
    authSnapshot.accountType = "admin";
    hasCurrentPrivilegedProof.mockResolvedValue(false);
    render(<LoginPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/mfa"));
  });

  it("exige a segunda etapa do admin quando não consegue conferir o nível da sessão", async () => {
    authSnapshot.accountType = "admin";
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

// #428: no preview, credencial errada abriu a tela do QR code.
describe("login com credencial inválida", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSnapshot.user = null;
    authSnapshot.accountType = null;
    authSnapshot.isLoading = false;
    signIn.mockResolvedValue({ success: false, error: "Invalid login credentials" });
  });

  it("mostra credenciais inválidas e não navega", async () => {
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Email"), "errado@exemplo.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeInTheDocument();
    expect(
      replace,
      "CREDENCIAL ERRADA NAVEGOU: login falho abriu outra tela",
    ).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
