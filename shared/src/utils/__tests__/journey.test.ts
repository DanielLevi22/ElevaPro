import { describe, expect, it } from "vitest";
import { type JourneyInput, summarizeJourney } from "../journey";

const input = (extra: Partial<JourneyInput> = {}): JourneyInput => ({
  today: "2026-10-14",
  blocks: [
    {
      name: "Meu primeiro plano",
      start_date: "2026-09-15",
      end_date: "2026-10-13",
      status: "completed",
      end_reason: "block_completed",
    },
    {
      name: "Bloco 2 · Hipertrofia · 4x por semana",
      start_date: "2026-10-13",
      end_date: "2026-11-10",
      status: "active",
      end_reason: null,
    },
  ],
  records: [
    { exerciseId: "s", name: "Supino", weight: 12.5, previousWeight: 10, date: "2026-10-01" },
  ],
  adjustments: [
    {
      kind: "calories",
      before: 2150,
      after: 2000,
      reason: "weight_above_pace",
      at: "2026-09-28T12:00:00Z",
    },
  ],
  rests: [],
  weights: [78.4, 77.9, 76.5],
  days: [],
  ...extra,
});

describe("sua jornada (D1)", () => {
  it("os números do caminho todo: desde quando, peso, recordes e mudanças", () => {
    const journey = summarizeJourney(input());
    expect(journey).toMatchObject({
      since: "2026-09-15",
      weeks: 4,
      weightChange: -1.9,
      records: 1,
      // O recorde é da pessoa: o plano mudou uma vez, com a meta.
      changes: 1,
    });
  });

  it("desfazer o ajuste não conta como outra mudança", () => {
    const undo = {
      kind: "calories" as const,
      before: 2000,
      after: 2150,
      reason: "undo" as const,
      at: "2026-09-28T15:00:00Z",
    };
    const journey = summarizeJourney(input({ adjustments: [...input().adjustments, undo] }));
    expect(journey.changes).toBe(1);
  });

  it("a linha do tempo vai de hoje ao dia em que o plano nasceu", () => {
    const titles = summarizeJourney(input()).events.map((event) => event.title);
    expect(titles).toEqual([
      "Meu primeiro plano concluído",
      "Bloco 2 começou",
      "Recorde em Supino",
      "Meta 2.150 → 2.000 kcal",
      "Seu plano nasceu",
    ]);
  });

  it("o bloco trocado antes do fim e a pausa aparecem como foram", () => {
    const journey = summarizeJourney(
      input({
        blocks: [
          {
            name: "Bloco 2",
            start_date: "2026-10-01",
            end_date: "2026-10-05",
            status: "completed",
            end_reason: "changed_early",
          },
        ],
        rests: [{ id: "p", starts_on: "2026-10-07", planned_until: null, ended_on: "2026-10-10" }],
      }),
    );
    expect(journey.events.map((event) => [event.title, event.sub])).toContainEqual([
      "Modo Descanso",
      "3 dias de pausa",
    ]);
    expect(journey.events.map((event) => event.title)).toContain("Bloco 2 encerrado antes");
  });

  it("sem plano, sem jornada: nada de datas inventadas", () => {
    const journey = summarizeJourney(
      input({ blocks: [], records: [], adjustments: [], weights: [] }),
    );
    expect(journey).toMatchObject({ since: null, weeks: 0, weightChange: null, events: [] });
  });

  it("plano trocado não é bloco, e o bloco que começa amanhã ainda não aconteceu", () => {
    const journey = summarizeJourney(
      input({
        blocks: [
          {
            name: "Meu primeiro plano",
            start_date: "2026-09-01",
            end_date: "2026-09-29",
            status: "completed",
            end_reason: "replaced",
          },
          {
            name: "Meu primeiro plano",
            start_date: "2026-10-01",
            end_date: "2026-10-29",
            status: "completed",
            end_reason: null,
          },
          {
            name: "Bloco 1",
            start_date: "2026-10-05",
            end_date: "2026-10-14",
            status: "completed",
            end_reason: "changed_early",
          },
          {
            name: "Bloco 2",
            start_date: "2026-10-15",
            end_date: "2026-11-12",
            status: "active",
            end_reason: null,
          },
        ],
        records: [],
        adjustments: [],
      }),
    );
    expect(journey.events.map((event) => event.title)).toEqual([
      "Bloco 1 encerrado antes",
      "Seu plano nasceu",
    ]);
  });
});
