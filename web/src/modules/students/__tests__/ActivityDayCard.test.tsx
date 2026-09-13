import type { ActivityDay, ActivityEvent } from "@elevapro/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityDayCard } from "../components/ActivityDayCard";

function evento(over: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "session-1",
    kind: "workout",
    author: "student",
    at: "2026-08-28T11:00:00Z",
    title: "Treino A — Push",
    detail: null,
    pse: null,
    studentNote: null,
    noteEditedAt: null,
    ...over,
  };
}

function dia(over: Partial<ActivityDay> = {}): ActivityDay {
  return { date: "2026-08-28", summary: null, events: [], ...over };
}

describe("ActivityDayCard", () => {
  // O aluno escolhe "Difícil" no modal do mobile; o especialista tem de ler a
  // mesma palavra. Só o número faria os dois falarem de "8" com significados
  // diferentes — que é o motivo de a escala ter virado função compartilhada.
  it("mostra a PSE com o rótulo da escala, não só o número", () => {
    render(<ActivityDayCard day={dia({ events: [evento({ pse: 8 })] })} />);
    expect(screen.getByText("PSE 8 — Puxado")).toBeInTheDocument();
  });

  // O feedback existia e nenhuma tela do web o lia. É a razão de ser da feature.
  it("mostra a observação que o aluno escreveu", () => {
    render(
      <ActivityDayCard day={dia({ events: [evento({ studentNote: "senti dor no ombro" })] })} />,
    );
    expect(screen.getByText(/senti dor no ombro/)).toBeInTheDocument();
  });

  // Evento sem feedback some; não vira campo vazio nem travessão.
  it("não renderiza PSE nem observação quando não há", () => {
    render(<ActivityDayCard day={dia({ events: [evento()] })} />);
    expect(screen.queryByText(/PSE/)).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("rotula o cardio com duração e calorias", () => {
    render(
      <ActivityDayCard
        day={dia({
          events: [evento({ kind: "cardio", title: "Corrida", detail: "32 min · 280 kcal" })],
        })}
      />,
    );
    expect(screen.getByText("Corrida")).toBeInTheDocument();
    expect(screen.getByText("32 min · 280 kcal")).toBeInTheDocument();
  });

  // Para o especialista a ausência é a informação: três dias vazios seguidos é
  // o que ele precisa ver. Um dia que some da lista esconde isso.
  it("diz 'sem registro' no dia sem evento nenhum", () => {
    render(<ActivityDayCard day={dia()} />);
    expect(screen.getByText("sem registro")).toBeInTheDocument();
  });

  // A meta vem junto com o realizado: "3 refeições" não diz nada, "3/4" diz.
  it("mostra o resumo do dia com meta e realizado", () => {
    render(
      <ActivityDayCard
        day={dia({
          events: [evento()],
          summary: {
            mealsTarget: 4,
            mealsCompleted: 3,
            workoutTarget: 1,
            workoutCompleted: 1,
            completed: false,
          },
        })}
      />,
    );
    expect(screen.getByText("Treino 1/1 · Refeições 3/4")).toBeInTheDocument();
  });

  it("resume o dia fechado como 'dia completo'", () => {
    render(
      <ActivityDayCard
        day={dia({
          events: [evento()],
          summary: {
            mealsTarget: 4,
            mealsCompleted: 4,
            workoutTarget: 1,
            workoutCompleted: 1,
            completed: true,
          },
        })}
      />,
    );
    expect(screen.getByText("dia completo")).toBeInTheDocument();
  });

  // A marca é o que impede o especialista de agir sobre uma frase que já mudou.
  // Sem ela, corrigir passa despercebido e a prescrição sai ajustada para a
  // versão antiga — que é o cenário que motivou o PRD.
  it("mostra que o feedback foi corrigido, e quando", () => {
    render(
      <ActivityDayCard
        day={dia({
          events: [
            evento({ studentNote: "era o ombro esquerdo", noteEditedAt: "2026-08-28T14:00:00Z" }),
          ],
        })}
      />,
    );

    expect(screen.getByText(/corrigido em/i)).toBeInTheDocument();
  });

  it("não mostra a marca em feedback que nunca foi corrigido", () => {
    render(<ActivityDayCard day={dia({ events: [evento({ studentNote: "tudo certo" })] })} />);

    expect(screen.queryByText(/corrigido em/i)).not.toBeInTheDocument();
  });

  // Apagar a observação também é correção (Art. 18, VI), e o vazio depois de um
  // texto lido é justamente a informação que o especialista precisa ver.
  it("mostra a marca mesmo quando a observação foi apagada", () => {
    render(
      <ActivityDayCard
        day={dia({ events: [evento({ studentNote: null, noteEditedAt: "2026-08-28T14:00:00Z" })] })}
      />,
    );

    expect(screen.getByText(/corrigido em/i)).toBeInTheDocument();
  });
});
