import type { RecentActivityItem } from "@elevapro/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentActivity } from "../components/RecentActivity";

function item(over: Partial<RecentActivityItem> = {}): RecentActivityItem {
  return {
    id: "session-1",
    studentId: "aluno-1",
    studentName: "Marina Costa",
    kind: "workout",
    title: "Treino B — Pull",
    rpe: null,
    at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...over,
  };
}

describe("RecentActivity", () => {
  // O bloco é a porta de entrada do resto da feature: cada linha leva à aba
  // Atividades daquele aluno. Link errado aqui é a diferença entre um briefing
  // que resolve e um que só informa.
  it("leva cada linha para as Atividades do aluno correspondente", () => {
    render(<RecentActivity items={[item()]} />);
    expect(screen.getByRole("link", { name: /Marina Costa/ })).toHaveAttribute(
      "href",
      "/dashboard/students/aluno-1/activities",
    );
  });

  // Numa lista de dez alunos diferentes, é pelo nome que se procura — não pelo
  // tipo de evento, que era o que o bloco antigo mostrava primeiro.
  it("mostra o nome do aluno", () => {
    render(<RecentActivity items={[item()]} />);
    expect(screen.getByText("Marina Costa")).toBeInTheDocument();
  });

  // "Marina, RPE 8" três vezes na semana é conversa para hoje: é o sinal mais
  // barato de ler numa lista.
  it("mostra o RPE quando a sessão tem, e some quando não tem", () => {
    const { rerender } = render(<RecentActivity items={[item({ rpe: 8 })]} />);
    expect(screen.getByText("RPE 8 — Difícil")).toBeInTheDocument();

    rerender(<RecentActivity items={[item({ rpe: null })]} />);
    expect(screen.queryByText(/RPE/)).not.toBeInTheDocument();
  });

  it("mostra a distância em linguagem de conversa", () => {
    render(<RecentActivity items={[item()]} />);
    expect(screen.getByText("há 2 h")).toBeInTheDocument();
  });

  it("diz ontem para o que passou de um dia", () => {
    const ontem = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    render(<RecentActivity items={[item({ at: ontem })]} />);
    expect(screen.getByText("ontem")).toBeInTheDocument();
  });

  // Vazio deixou de ser sinônimo de erro: só aparece quando não há registro
  // nenhum, não quando o especialista passou uma semana fora.
  it("explica o vazio em vez de mostrar lista em branco", () => {
    render(<RecentActivity items={[]} />);
    expect(screen.getByText(/Nenhum aluno registrou atividade ainda/)).toBeInTheDocument();
  });

  it("lista uma linha por evento", () => {
    render(
      <RecentActivity
        items={[
          item({ id: "a", studentId: "aluno-1" }),
          item({ id: "b", studentId: "aluno-2", studentName: "Rafael Lima", kind: "cardio" }),
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
