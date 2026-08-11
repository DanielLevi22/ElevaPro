import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardSidebar } from "../DashboardSidebar";

let pathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: <span>d</span> },
  { href: "/dashboard/students", label: "Alunos", icon: <span>a</span> },
  { href: "/dashboard/workouts", label: "Treinos", icon: <span>t</span> },
  { href: "/dashboard/coach", label: "Coach IA", icon: <span>c</span>, badge: "Novo" },
];

function renderSidebar(overrides: Partial<Parameters<typeof DashboardSidebar>[0]> = {}) {
  const props = {
    navItems,
    contextChips: <span>chips</span>,
    userEmail: "daniel@elevapro.local",
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  };
  render(<DashboardSidebar {...props} />);
  return props;
}

describe("DashboardSidebar", () => {
  beforeEach(() => {
    pathname = "/dashboard";
  });

  it("expandido, mostra os rótulos e a marca", () => {
    renderSidebar();
    expect(screen.getByText("Alunos")).toBeInTheDocument();
    expect(screen.getByText("Menu")).toBeInTheDocument();
  });

  it("colapsado, esconde rótulos mas mantém os links navegáveis", () => {
    renderSidebar({ isCollapsed: true });
    expect(screen.queryByText("Alunos")).not.toBeInTheDocument();
    expect(screen.getByTitle("Alunos")).toBeInTheDocument();
  });

  it("colapsado, esconde a busca e os chips de contexto", () => {
    renderSidebar({ isCollapsed: true });
    expect(screen.queryByLabelText("Filtrar itens do menu")).not.toBeInTheDocument();
    expect(screen.queryByText("chips")).not.toBeInTheDocument();
  });

  it("o botão de recolher dispara o callback", async () => {
    const { onToggleCollapse } = renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: "Recolher menu lateral" }));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it("colapsado, oferece expandir", () => {
    renderSidebar({ isCollapsed: true });
    expect(screen.getByRole("button", { name: "Expandir menu lateral" })).toBeInTheDocument();
  });

  it("a busca filtra os itens pelo rótulo", async () => {
    renderSidebar();
    await userEvent.type(screen.getByLabelText("Filtrar itens do menu"), "trein");
    expect(screen.getByText("Treinos")).toBeInTheDocument();
    expect(screen.queryByText("Alunos")).not.toBeInTheDocument();
  });

  it("busca sem resultado avisa em vez de mostrar lista vazia", async () => {
    renderSidebar();
    await userEvent.type(screen.getByLabelText("Filtrar itens do menu"), "zzz");
    expect(screen.getByText("Nenhum item encontrado.")).toBeInTheDocument();
  });

  it("exibe o badge do item quando expandido", () => {
    renderSidebar();
    expect(screen.getByText("Novo")).toBeInTheDocument();
  });

  // O item ativo é destacado por rota. Um `startsWith` ingênuo marcaria
  // /dashboard como ativo em toda subrota, acendendo dois itens ao mesmo tempo.
  it("marca só a rota mais específica como ativa", () => {
    pathname = "/dashboard/students";
    renderSidebar();
    const activeLabel = screen.getByText("Alunos");
    expect(activeLabel.className).toContain("italic");
    expect(screen.getByText("Dashboard").className).not.toContain("italic");
  });

  it("o logout dispara o callback", async () => {
    const { onLogout } = renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
