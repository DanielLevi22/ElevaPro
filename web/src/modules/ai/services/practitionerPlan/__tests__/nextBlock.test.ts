import type { NextBlockPending, OnboardingPlanPending } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

let steps: string[];
let namings: { name: string; phaseName: string; loads?: ReadonlyMap<string, string> }[];
let answers: Record<string, unknown>[];
/** `undefined` é a gravação lendo o início do bloco; `null` é não haver bloco ativo. */
let activeBlock: { id: string; end_date: string; plans: unknown[] } | null | undefined;

/** O admin: o bloco ativo, o início do bloco que acaba e as séries feitas nele. */
vi.mock("@/lib/supabase-admin", () => {
  const chain = (result: () => unknown) => {
    const node: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "not", "gte", "order", "limit"]) {
      node[method] = () => node;
    }
    node.single = async () => result();
    node.maybeSingle = async () => result();
    // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
    node.then = (resolve: (value: unknown) => void) => resolve(result());
    return node;
  };
  return {
    supabaseAdmin: {
      from: (table: string) => {
        if (table === "workout_sessions") {
          return chain(() => ({
            data: [
              {
                exercises: [
                  {
                    exercise_id: "supino",
                    sets: [
                      { weight_actual: 10, completed: true },
                      { weight_actual: 12.5, completed: true },
                      { weight_actual: 15, completed: false },
                    ],
                  },
                  { exercise_id: "prancha", sets: [{ weight_actual: null, completed: true }] },
                ],
              },
            ],
            error: null,
          }));
        }
        if (table === "training_periodizations") {
          return chain(() => ({
            data: activeBlock === undefined ? { start_date: "2026-09-19" } : activeBlock,
            error: null,
          }));
        }
        return chain(() => ({ data: null, error: null }));
      },
    },
  };
});

vi.mock("../savePlan", () => ({
  saveTraining: async (_ctx: unknown, _plan: unknown, naming: (typeof namings)[number]) => {
    steps.push("training");
    namings.push(naming);
    return "bloco-2";
  },
  saveDiet: async () => {
    steps.push("diet");
    return "dieta-2";
  },
  saveAnswers: async (_ctx: unknown, changed: Record<string, unknown>) => {
    steps.push("answers");
    answers.push(changed);
  },
  finishPreviousTraining: async (_id: string, keep: string, reason: string) => {
    steps.push(`finish-training:${keep}:${reason}`);
  },
  activeOwnDietId: async () => "dieta-1",
  markEndedDiet: async (dietId: string, reason: string) => {
    steps.push(`finish-diet:${dietId}:${reason}`);
  },
}));

vi.mock("../generatePlan", () => ({ generatePractitionerPlan: vi.fn() }));

const { saveNextBlock } = await import("../saveNextBlock");
const { prepareNextBlock } = await import("../nextBlock");

const plan = {
  proposal: { workouts: [{ title: "A", optional: false, exercises: [] }], meals: [] },
  target: { calories: 2000, protein: 150, carbs: 220, fat: 60, guards: [] },
  goal: "Hipertrofia",
} as unknown as OnboardingPlanPending;

const next = (changes: NextBlockPending["changes"]): NextBlockPending => ({
  plan,
  blockNumber: 2,
  previousBlockId: "bloco-1",
  comparison: {
    trainingDays: { before: 1, after: 1 },
    newExercises: [],
    keptExercises: 0,
    calories: { before: 2000, after: 2000 },
  },
  changes,
});

const ctx = () => ({
  studentId: "aluno-1",
  titular: {} as SupabaseClient,
  registrar: vi.fn(),
});

describe("aprovar o próximo bloco", () => {
  beforeEach(() => {
    steps = [];
    namings = [];
    answers = [];
    activeBlock = undefined;
  });

  it("o bloco ganha o número e parte das cargas conquistadas, só das séries feitas", async () => {
    await saveNextBlock(ctx(), next({}));

    expect(namings[0].name).toBe("Bloco 2 · Hipertrofia · 1x por semana");
    expect(namings[0].phaseName).toBe("Bloco 2");
    expect([...(namings[0].loads ?? [])]).toEqual([["supino", "12,5"]]);
  });

  // Encerrar, nunca apagar, e só no fim: se a gravação falhar no meio, o
  // desfazer apaga o novo e o bloco anterior continua valendo.
  it("o anterior é encerrado por último, com o motivo de fim de bloco", async () => {
    await saveNextBlock(ctx(), next({}));

    expect(steps).toEqual([
      "training",
      "diet",
      "finish-training:bloco-2:block_completed",
      "finish-diet:dieta-1:block_completed",
    ]);
  });

  it("a anamnese só muda com o que mudou na reavaliação", async () => {
    await saveNextBlock(ctx(), next({ gym_type: "Home gym", injuries: ["Joelhos"] }));

    expect(answers).toEqual([
      { gym_type: "Home gym", injury_reported: true, injuries: ["Joelhos"] },
    ]);
  });
});

describe("montar o próximo bloco", () => {
  beforeEach(() => {
    activeBlock = null;
  });

  it("sem bloco do próprio Praticante, não há o que montar", async () => {
    await expect(prepareNextBlock("aluno-1", {}, "2026-10-17")).resolves.toEqual({
      ok: false,
      reason: "no_block",
    });
  });

  it("com o bloco ainda correndo, o próximo espera", async () => {
    activeBlock = { id: "bloco-1", end_date: "2026-10-17", plans: [] };
    await expect(prepareNextBlock("aluno-1", {}, "2026-10-16")).resolves.toEqual({
      ok: false,
      reason: "block_running",
    });
  });
});
