import type { BriefingSignal } from "@elevapro/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AttentionCard } from "../components/AttentionCard";

const signal = (over: Partial<BriefingSignal>): BriefingSignal => ({
  studentId: "aluno-1",
  studentName: "Ana Souza",
  kind: "inactive",
  tone: "danger",
  message: "Não treina há 6 dias. Risco de abandono.",
  days: 6,
  ...over,
});

describe("AttentionCard (F8)", () => {
  it("quem sumiu ganha o atalho para a mensagem, nas notas do aluno", () => {
    render(<AttentionCard signal={signal({ kind: "meals_unlogged", tone: "warning" })} />);

    expect(screen.getByRole("link", { name: "Ana Souza" })).toHaveAttribute(
      "href",
      "/dashboard/students/aluno-1",
    );
    expect(screen.getByRole("link", { name: "Mensagem" })).toHaveAttribute(
      "href",
      "/dashboard/students/aluno-1#notes",
    );
  });

  it("anamnese pronta não pede mensagem: o próximo passo é montar o plano", () => {
    render(<AttentionCard signal={signal({ kind: "anamnesis_ready", tone: "success" })} />);
    expect(screen.queryByRole("link", { name: "Mensagem" })).toBeNull();
  });

  // Link dentro de link é HTML inválido: o cartão e a mensagem são irmãos.
  it("os dois links são irmãos, nunca um dentro do outro", () => {
    const { container } = render(<AttentionCard signal={signal({})} />);
    expect(container.querySelector("a a")).toBeNull();
  });
});
