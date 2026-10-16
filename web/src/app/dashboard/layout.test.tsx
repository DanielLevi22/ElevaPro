import type { Session } from "@supabase/supabase-js";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Suspense, use } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, router, navigation } = vi.hoisted(() => ({
  auth: {
    getClaims: vi.fn(),
    mfa: { listFactors: vi.fn() },
  },
  router: { push: vi.fn(), replace: vi.fn() },
  navigation: { pathname: "/dashboard" },
}));

// O SDK e o roteador são as fronteiras externas; layout, store e prova são reais.
vi.mock("@/packages/supabase/client", () => ({ supabase: { auth } }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => navigation.pathname,
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

import { useAuthStore } from "@/modules/auth";
import DashboardLayout from "./layout";
import DashboardLoading from "./loading";

function createSession(userId = "specialist-1", accessToken = "test-session"): Session {
  return {
    access_token: accessToken,
    refresh_token: "test-refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: userId, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" },
  };
}

function showSession(
  session: Session | null,
  accountType: "specialist" | "admin" | "student" = "specialist",
) {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    accountType: session ? accountType : null,
    abilities: null,
    services: [],
    isLoading: false,
  });
}

function renderDashboard() {
  return render(
    <DashboardLayout>
      <p>Conteúdo protegido</p>
    </DashboardLayout>,
  );
}

function createClaimsReply(aal = "aal2") {
  return { data: { claims: { aal, amr: [{ method: "totp" }] } }, error: null };
}

function pendingClaims() {
  let resolve = (_reply: ReturnType<typeof createClaimsReply>): void => {};
  const promise = new Promise<ReturnType<typeof createClaimsReply>>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

function PendingPage({ content }: { content: Promise<string> }) {
  return <p>{use(content)}</p>;
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  delete process.env.NEXT_PUBLIC_PASSKEY_ENABLED;
  navigation.pathname = "/dashboard";
  auth.getClaims.mockResolvedValue(createClaimsReply());
  showSession(createSession());
});

describe("continuidade do dashboard", () => {
  it("preserva o menu e seu estado ao navegar e voltar com a mesma sessão", async () => {
    const dashboard = renderDashboard();
    const sidebar = await screen.findByRole("complementary");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Dashboard" } });
    // Uma nova verificação ficaria pendente: navegar não deve depender dela.
    auth.getClaims.mockReturnValue(new Promise(() => {}));

    for (const pathname of ["/dashboard/students", "/dashboard/workouts", "/dashboard"]) {
      navigation.pathname = pathname;
      dashboard.rerender(
        <DashboardLayout>
          <p>Conteúdo protegido</p>
        </DashboardLayout>,
      );
      expect(screen.getByRole("complementary")).toBe(sidebar);
      expect(screen.getByRole("searchbox")).toHaveValue("Dashboard");
      expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    }
  });

  // Art. 46: uma prova anterior não autoriza a sessão substituta, mesmo na mesma conta.
  it("não mostra conteúdo protegido enquanto valida um token substituto", async () => {
    renderDashboard();
    await screen.findByText("Conteúdo protegido");
    const session = useAuthStore.getState().session;
    auth.getClaims.mockReturnValue(new Promise(() => {}));

    act(() => showSession({ ...createSession(), ...session, access_token: "replacement-session" }));

    expect(
      screen.queryByText("Conteúdo protegido"),
      "ACESSO INDEVIDO: token substituto herdou a prova anterior",
    ).not.toBeInTheDocument();
  });

  // Art. 46: uma resposta de outra identidade não pode mudar o acesso da conta atual.
  it("ignora uma recusa atrasada da conta anterior", async () => {
    const previousCheck = pendingClaims();
    auth.getClaims.mockReturnValueOnce(previousCheck.promise);
    renderDashboard();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();

    act(() => showSession(createSession("specialist-2", "second-session")));
    await screen.findByText("Conteúdo protegido");
    await act(async () => previousCheck.resolve(createClaimsReply("aal1")));

    expect(
      router.replace,
      "SESSÃO ERRADA: resposta obsoleta redirecionou a conta atual",
    ).not.toHaveBeenCalled();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  // Art. 46: prefixos parecidos não dão ao Student acesso à gestão de outros alunos.
  it("não exibe a gestão de alunos para um student", async () => {
    navigation.pathname = "/dashboard/students";
    showSession(createSession("student-1"), "student");
    renderDashboard();
    await act(async () => {});

    expect(
      screen.queryByText("Conteúdo protegido"),
      "ACESSO INDEVIDO: student visualizou uma rota de gestão",
    ).not.toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith("/dashboard/student");
  });

  // Art. 46: revalidar a sessão suspende a prova anterior até a nova decisão.
  it("não reutiliza uma aprovação durante a revalidação da sessão", async () => {
    renderDashboard();
    await screen.findByText("Conteúdo protegido");
    auth.getClaims.mockReturnValue(new Promise(() => {}));
    act(() => useAuthStore.setState({ isLoading: true }));
    act(() => useAuthStore.setState({ isLoading: false }));

    expect(
      screen.queryByText("Conteúdo protegido"),
      "ACESSO INDEVIDO: revalidação pendente usou uma aprovação antiga",
    ).not.toBeInTheDocument();
  });

  // Art. 46: ausência de perfil não é um papel autorizado.
  it("não libera conteúdo quando o papel da conta está indisponível", async () => {
    useAuthStore.setState({ accountType: null });
    renderDashboard();
    await act(async () => {});

    expect(
      screen.queryByText("Conteúdo protegido"),
      "ACESSO INDEVIDO: conta sem papel acessou o dashboard",
    ).not.toBeInTheDocument();
  });

  it("mantém o menu enquanto o conteúdo da próxima página aguarda dados", async () => {
    let resolveContent = (_content: string): void => {};
    const content = new Promise<string>((resolve) => {
      resolveContent = resolve;
    });
    render(
      <DashboardLayout>
        <Suspense fallback={<DashboardLoading />}>
          <PendingPage content={content} />
        </Suspense>
      </DashboardLayout>,
    );
    const sidebar = await screen.findByRole("complementary");
    expect(screen.getByRole("status", { name: "Carregando página" })).toBeInTheDocument();

    await act(async () => resolveContent("Página carregada"));

    expect(screen.getByText("Página carregada")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("complementary")).toBe(sidebar);
  });

  it("mantém o menu quando o SDK restaura a mesma sessão com novos objetos", async () => {
    renderDashboard();
    const sidebar = await screen.findByRole("complementary");
    auth.getClaims.mockReturnValue(new Promise(() => {}));
    act(() => showSession(createSession()));
    expect(screen.getByRole("complementary")).toBe(sidebar);
  });

  it("permite que um admin com prova válida navegue sem remontar o menu", async () => {
    showSession(createSession("admin-1"), "admin");
    const dashboard = renderDashboard();
    const sidebar = await screen.findByRole("complementary");
    navigation.pathname = "/dashboard/workouts";
    dashboard.rerender(
      <DashboardLayout>
        <p>Conteúdo protegido</p>
      </DashboardLayout>,
    );
    expect(screen.getByRole("complementary")).toBe(sidebar);
  });

  it("mantém a estrutura entre as rotas permitidas do student", async () => {
    showSession(createSession("student-1"), "student");
    navigation.pathname = "/dashboard/student";
    const dashboard = renderDashboard();
    const sidebar = await screen.findByRole("complementary");
    for (const pathname of [
      "/dashboard/workouts",
      "/dashboard/diets/plan-1",
      "/dashboard/student/progress",
    ]) {
      navigation.pathname = pathname;
      dashboard.rerender(
        <DashboardLayout>
          <p>Conteúdo protegido</p>
        </DashboardLayout>,
      );
      expect(screen.getByRole("complementary")).toBe(sidebar);
    }
  });

  // Art. 46: senha simples ou falha no provedor não autorizam dados protegidos.
  it.each(["sem prova", "erro do provedor"])("não libera conteúdo com %s", async (scenario) => {
    if (scenario === "sem prova") auth.getClaims.mockResolvedValue(createClaimsReply("aal1"));
    else auth.getClaims.mockRejectedValue(new Error("provedor indisponível"));
    renderDashboard();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth/mfa"));
    expect(
      screen.queryByText("Conteúdo protegido"),
      "ACESSO INDEVIDO: prova ausente ou falha liberou conteúdo",
    ).not.toBeInTheDocument();
  });

  // Art. 46: logout retira o conteúdo mesmo se a prova antiga terminar depois.
  it("não restaura conteúdo nem redireciona por uma resposta anterior ao logout", async () => {
    const previousCheck = pendingClaims();
    auth.getClaims.mockReturnValueOnce(previousCheck.promise);
    renderDashboard();
    act(() => showSession(null));
    await act(async () => previousCheck.resolve(createClaimsReply()));
    expect(
      screen.queryByText("Conteúdo protegido"),
      "ACESSO APÓS LOGOUT: resposta antiga restaurou conteúdo",
    ).not.toBeInTheDocument();
    expect(router.push).toHaveBeenCalledWith("/auth/login");
    expect(router.replace).not.toHaveBeenCalled();
  });

  // Art. 46: trocar o papel exige a prova aplicável à nova autorização.
  it("não herda a aprovação quando o papel muda", async () => {
    renderDashboard();
    await screen.findByText("Conteúdo protegido");
    auth.getClaims.mockReturnValue(new Promise(() => {}));
    act(() => useAuthStore.setState({ accountType: "admin" }));
    expect(
      screen.queryByText("Conteúdo protegido"),
      "ACESSO INDEVIDO: novo papel herdou aprovação anterior",
    ).not.toBeInTheDocument();
  });
});
