import type { NextBlockPending, OnboardingPlanPending } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

let steps: string[];
let namings: {
  name: string;
  phaseName: string;
  loads?: ReadonlyMap<string, string>;
  startDate?: string;
}[];
let answers: Record<string, unknown>[];
/** Se o aluno tem especialista ativo. */
let linked = false;
/** `undefined` é a gravação lendo o início do bloco; `null` é não haver bloco ativo. */
let activeBlock: { id: string; end_date: string; plans: unknown[] } | null | undefined;
/** Os motivos de fim que a contagem dos blocos pediu, e quantos blocos ela acha. */
let countedReasons: string[];
let endedBlocks = 0;

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
        if (table === "student_specialists") {
          return chain(() => ({ count: linked ? 1 : 0, error: null }));
        }
        if (table === "training_periodizations") {
          const node = chain(() => ({
            data: activeBlock === undefined ? { start_date: "2026-09-19" } : activeBlock,
            error: null,
          }));
          node.in = (_column: string, reasons: string[]) => {
            countedReasons = reasons;
            return chain(() => ({ count: endedBlocks, error: null }));
          };
          return node;
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

let tracks: string[];
/** A semana em que o peso parou há 3 semanas, ou nula. */
let stalled: string | null = null;
vi.mock("@elevapro/shared", async (original) => ({
  ...(await original<typeof import("@elevapro/shared")>()),
  createWeeklyCheckInService: () => ({ stalledWeek: async () => stalled }),
  createAdaptiveAnamnesisService: () => ({
    savePersonaTrack: async (_id: string, track: string) => {
      tracks.push(track);
    },
  }),
}));

const { generatePractitionerPlan } = await import("../generatePlan");
const { saveNextBlock } = await import("../saveNextBlock");
const { prepareNextBlock } = await import("../nextBlock");

const plan = {
  proposal: { workouts: [{ title: "A", optional: false, exercises: [] }], meals: [] },
  target: { calories: 2000, protein: 150, carbs: 220, fat: 60, guards: [] },
  goal: "Hipertrofia",
} as unknown as OnboardingPlanPending;

const next = (changes: NextBlockPending["changes"], early = false): NextBlockPending => ({
  plan,
  blockNumber: 2,
  previousBlockId: "bloco-1",
  comparison: {
    trainingDays: { before: 1, after: 1 },
    newExercises: [],
    keptExercises: 0,
    calories: { before: 2000, after: 2000 },
    level: null,
  },
  changes,
  early,
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
    tracks = [];
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

  // A7: subir de nível é proposta aceita na reavaliação; sem o "sim", nada muda.
  it("quem aceitou subir grava o nível novo; quem não aceitou, não", async () => {
    await saveNextBlock(ctx(), next({ level: "intermediate" }));
    await saveNextBlock(ctx(), next({}));

    expect(tracks).toEqual(["intermediate"]);
  });

  // C2: trocado antes do fim, nada é apagado; o atual fecha com o motivo, e o
  // novo começa amanhã, para o treino de hoje ainda ser o do bloco atual.
  it("trocado antes do fim, o novo começa amanhã e o atual fecha como encerrado antes", async () => {
    await saveNextBlock(ctx(), next({ main_goal: "Hipertrofia" }, true));

    expect(namings[0].startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(steps).toContain("finish-training:bloco-2:changed_early");
    expect(steps).toContain("finish-diet:dieta-1:changed_early");
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
    linked = false;
  });

  // O Aluno é reavaliado pelo especialista, que monta o bloco dele (#376).
  it("com especialista ativo, o app não monta bloco nenhum", async () => {
    linked = true;
    activeBlock = { id: "bloco-1", end_date: "2026-10-17", plans: [] };
    await expect(prepareNextBlock("aluno-1", {}, "2026-10-17")).resolves.toEqual({
      ok: false,
      reason: "has_specialist",
    });
  });

  it("sem bloco do próprio Praticante, não há o que montar", async () => {
    await expect(prepareNextBlock("aluno-1", {}, "2026-10-17")).resolves.toEqual({
      ok: false,
      reason: "no_block",
    });
  });

  it("antes do fim, só com alguma mudança: sem ela, o bloco atual segue", async () => {
    activeBlock = { id: "bloco-1", end_date: "2026-10-17", plans: [] };
    await expect(prepareNextBlock("aluno-1", {}, "2026-10-10", true)).resolves.toEqual({
      ok: false,
      reason: "no_changes",
    });
  });

  // #376: estagnação de 3 semanas com a meta seguida antecipa a reavaliação,
  // mesmo sem nada ter mudado. O servidor confere: o app só oferece.
  it("antes do fim, o peso parado há 3 semanas basta para montar", async () => {
    activeBlock = { id: "bloco-1", end_date: "2026-10-17", plans: [] };
    stalled = "2026-10-05";
    vi.mocked(generatePractitionerPlan).mockResolvedValue({ ok: false, reason: "plan_rejected" });

    await expect(prepareNextBlock("aluno-1", {}, "2026-10-10", true)).resolves.toEqual({
      ok: false,
      reason: "plan_rejected",
    });
    expect(generatePractitionerPlan).toHaveBeenCalled();
    stalled = null;
  });

  // O bloco trocado antes do fim também é um bloco: sem contá-lo, o próximo
  // repetia o número do atual ("Bloco 3" depois do Bloco 3).
  it("o número do próximo bloco conta os trocados antes do fim", async () => {
    activeBlock = { id: "bloco-3", end_date: "2026-10-17", plans: [] };
    endedBlocks = 2;
    vi.mocked(generatePractitionerPlan).mockResolvedValue({ ok: true, pending: plan });

    const outcome = await prepareNextBlock("aluno-1", {}, "2026-10-17");

    if (!outcome.ok) throw new Error(`esperava o bloco, veio ${outcome.reason}`);
    expect(outcome.pending.blockNumber).toBe(4);
    expect(countedReasons).toEqual(["block_completed", "changed_early"]);
    endedBlocks = 0;
  });

  it("com o bloco ainda correndo, o próximo espera", async () => {
    activeBlock = { id: "bloco-1", end_date: "2026-10-17", plans: [] };
    await expect(prepareNextBlock("aluno-1", {}, "2026-10-16")).resolves.toEqual({
      ok: false,
      reason: "block_running",
    });
  });
});
