import type { BriefingSignal } from "@elevapro/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BriefingPage from "../pages/BriefingPage";

const STATS = { activeStudents: 3, workoutTemplates: 12, activeDietPlans: 4, aiSessions: 86 };

const inactive: BriefingSignal = {
  studentId: "aluno-1",
  studentName: "João Silva",
  kind: "inactive",
  tone: "danger",
  message: "Não treina há 9 dias. Risco de abandono.",
  days: 9,
};

const ready: BriefingSignal = {
  studentId: "aluno-2",
  studentName: "Beatriz Souza",
  kind: "anamnesis_ready",
  tone: "success",
  message: "Anamnese concluída — pronto para receber o plano.",
  days: 0,
};

describe("BriefingPage", () => {
  it("abre com o parágrafo do dia e os sinais", () => {
    render(<BriefingPage signals={[inactive, ready]} stats={STATS} today="12 de agosto" />);

    expect(screen.getByText(/Briefing de 12 de agosto/)).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText(/Não treina há 9 dias/)).toBeInTheDocument();
  });

  it("leva cada cartão ao aluno correspondente", () => {
    render(<BriefingPage signals={[inactive]} stats={STATS} today="12 de agosto" />);

    expect(screen.getByRole("link", { name: /João Silva/ })).toHaveAttribute(
      "href",
      "/dashboard/students/aluno-1",
    );
  });

  // "Sem nada a sinalizar" é resposta, não ausência de tela: sem isto o
  // especialista fica olhando um espaço vazio sem saber se carregou.
  it("diz que está tudo em dia quando há alunos e nenhum sinal", () => {
    render(<BriefingPage signals={[]} stats={STATS} today="12 de agosto" />);

    expect(screen.getByText(/Ninguém precisa de ação agora/)).toBeInTheDocument();
    expect(screen.getByText(/Nada exige ação agora/)).toBeInTheDocument();
  });

  it("convida a vincular o primeiro aluno quando não há nenhum", () => {
    render(
      <BriefingPage
        signals={[]}
        stats={{ activeStudents: 0, workoutTemplates: 0, activeDietPlans: 0, aiSessions: 0 }}
        today="12 de agosto"
      />,
    );

    expect(screen.getByText(/Vincule um aluno/)).toBeInTheDocument();
    expect(screen.getByText(/ainda não tem alunos ativos/)).toBeInTheDocument();
  });

  it("concorda o texto no singular", () => {
    render(
      <BriefingPage
        signals={[inactive]}
        stats={{ ...STATS, activeStudents: 1 }}
        today="12 de agosto"
      />,
    );

    expect(screen.getByText(/1 aluno ativo/)).toBeInTheDocument();
    expect(screen.getByText(/precisa de atenção hoje/)).toBeInTheDocument();
  });

  it("mostra os números no rodapé", () => {
    render(<BriefingPage signals={[]} stats={STATS} today="12 de agosto" />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("modelos de treino")).toBeInTheDocument();
    expect(screen.getByText("86")).toBeInTheDocument();
  });
});
