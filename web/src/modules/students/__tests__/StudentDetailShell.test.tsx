import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentDetailShell } from "../components/StudentDetailShell";

let pathname = "/dashboard/students/s-1";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "s-1" }),
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

const students = [
  {
    id: "s-1",
    full_name: "João Silva",
    email: "joao@email.com",
    avatar_url: null,
    account_status: "active" as const,
    service_type: "personal_training",
    link_status: "active",
    link_created_at: "2026-06-01T00:00:00Z",
  },
];

let studentList: typeof students = students;

vi.mock("@/shared/hooks/useStudents", () => ({
  useStudents: () => ({ data: studentList, isLoading: false }),
  // A tela busca por id: procurar na listagem era o que deixava o aluno de
  // número 201 fora, porque a listagem pagina.
  useStudent: (id: string) => ({
    data: studentList.find((s) => s.id === id) ?? null,
    isLoading: false,
  }),
}));

vi.mock("../components/EditStudentModal", () => ({
  EditStudentModal: () => null,
}));

vi.mock("../components/AssessmentModal", () => ({
  AssessmentModal: () => null,
}));

describe("StudentDetailShell", () => {
  beforeEach(() => {
    pathname = "/dashboard/students/s-1";
    studentList = students;
  });

  it("mostra o aluno e o status no cabecalho", () => {
    render(
      <StudentDetailShell>
        <p>conteudo</p>
      </StudentDetailShell>,
    );
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });

  it("renderiza o conteudo da aba ativa", () => {
    render(
      <StudentDetailShell>
        <p>conteudo</p>
      </StudentDetailShell>,
    );
    expect(screen.getByText("conteudo")).toBeInTheDocument();
  });

  // O fluxo anterior era uma grade de cartoes: entrar numa secao tirava o
  // usuario da tela e obrigava a voltar para alcancar a proxima.
  it("expoe todas as secoes como aba sem sair da tela", () => {
    render(
      <StudentDetailShell>
        <p>conteudo</p>
      </StudentDetailShell>,
    );
    for (const label of [
      "Visão Geral",
      "Nutrição",
      "Avaliações",
      "Anamnese",
      "Métricas",
      "Mapa Muscular",
      "Atividades",
      "Assistente",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  // A rota /dashboard/students/[id]/workouts nao existe -- os treinos foram
  // unificados em /dashboard/workouts. A aba apontaria para 404.
  it("nao oferece aba de Treinos", () => {
    render(
      <StudentDetailShell>
        <p>conteudo</p>
      </StudentDetailShell>,
    );
    expect(screen.queryByRole("link", { name: "Treinos" })).not.toBeInTheDocument();
  });

  it("marca como atual so a aba da rota vigente", () => {
    pathname = "/dashboard/students/s-1/metrics";
    render(
      <StudentDetailShell>
        <p>conteudo</p>
      </StudentDetailShell>,
    );
    expect(screen.getByRole("link", { name: "Métricas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Visão Geral" })).not.toHaveAttribute("aria-current");
  });

  it("aluno inexistente oferece volta para a lista", () => {
    studentList = [];
    render(
      <StudentDetailShell>
        <p>conteudo</p>
      </StudentDetailShell>,
    );
    expect(screen.getByText("Aluno não encontrado")).toBeInTheDocument();
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });
});
