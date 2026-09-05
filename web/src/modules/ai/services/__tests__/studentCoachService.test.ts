import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: mockFrom },
}));

const {
  getOrCreateStudentCoachSession,
  getStudentSessionMessages,
  saveStudentMessage,
  saveStudentCoachPlan,
} = await import("../studentCoachService");

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return chain;
}

describe("getOrCreateStudentCoachSession", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns existing session id when one exists", async () => {
    const chain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "session-abc" }, error: null }),
    });
    mockFrom.mockReturnValue(chain);

    const id = await getOrCreateStudentCoachSession("student-1");

    expect(id).toBe("session-abc");
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("creates a new session when none exists", async () => {
    const chain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: { id: "session-new" }, error: null }),
    });
    mockFrom.mockReturnValue(chain);

    const id = await getOrCreateStudentCoachSession("student-1");

    expect(id).toBe("session-new");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "student-1",
        module: "student_coach",
        specialist_id: null,
      }),
    );
  });

  it("throws when session creation fails", async () => {
    const chain = makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    });
    mockFrom.mockReturnValue(chain);

    await expect(getOrCreateStudentCoachSession("student-1")).rejects.toThrow(
      "Failed to create student coach session",
    );
  });
});

describe("getStudentSessionMessages", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns mapped messages in order", async () => {
    const rows = [
      { id: "msg-1", role: "user", content: "Oi", created_at: "2026-01-01T10:00:00Z" },
      { id: "msg-2", role: "assistant", content: "Olá!", created_at: "2026-01-01T10:00:01Z" },
    ];
    const chain = makeChain();
    (chain.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: rows, error: null });
    mockFrom.mockReturnValue(chain);

    const messages = await getStudentSessionMessages("session-1");

    expect(messages).toEqual([
      { id: "msg-1", role: "user", content: "Oi", createdAt: "2026-01-01T10:00:00Z" },
      { id: "msg-2", role: "assistant", content: "Olá!", createdAt: "2026-01-01T10:00:01Z" },
    ]);
  });

  it("returns empty array when no messages exist", async () => {
    const chain = makeChain();
    (chain.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const messages = await getStudentSessionMessages("session-1");

    expect(messages).toEqual([]);
  });
});

describe("saveStudentMessage", () => {
  afterEach(() => vi.clearAllMocks());

  it("inserts message with correct fields", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);

    await saveStudentMessage("session-1", "user", "Quero treinar", { source: "chat" });

    expect(chain.insert).toHaveBeenCalledWith({
      session_id: "session-1",
      role: "user",
      content: "Quero treinar",
      metadata: { source: "chat" },
    });
  });

  it("defaults metadata to empty object when not provided", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);

    await saveStudentMessage("session-1", "assistant", "Vamos lá!");

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
  });
});

describe("saveStudentCoachPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  const workout = {
    split_name: "Push Pull Legs",
    goal: "Hipertrofia",
    duration_weeks: 8,
    days_per_week: 4,
    level: "intermediario" as const,
    days: [
      {
        day_label: "Segunda - Push",
        muscle_groups: ["peito", "ombro", "triceps"],
        exercise_count: 5,
        duration_min: 60,
      },
      {
        day_label: "Terca - Pull",
        muscle_groups: ["costas", "biceps"],
        exercise_count: 4,
        duration_min: 50,
      },
    ],
  };

  const nutrition = {
    daily_calories: 2800,
    protein_g: 180,
    carbs_g: 320,
    fat_g: 80,
    meals_count: 5,
    strategy: "Superavit moderado",
  };

  it("inserts periodization and training plan days, returns periodization id", async () => {
    const periodChain = makeChain({
      single: vi.fn().mockResolvedValue({ data: { id: "period-xyz" }, error: null }),
    });
    const plansChain = makeChain();
    const sessionsChain = makeChain();

    mockFrom
      .mockReturnValueOnce(periodChain) // training_periodizations
      .mockReturnValueOnce(plansChain) // training_plans
      .mockReturnValueOnce(sessionsChain); // ai_chat_sessions

    const id = await saveStudentCoachPlan("student-1", "sessao-1", workout, nutrition);

    expect(id).toBe("period-xyz");
    expect(periodChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "student-1",
        specialist_id: null,
        name: "Push Pull Legs",
        objective: "Hipertrofia",
        duration_weeks: 8,
        status: "active",
      }),
    );
    expect(plansChain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "Segunda - Push", focus: "peito, ombro, triceps" }),
        expect.objectContaining({ name: "Terca - Pull", focus: "costas, biceps" }),
      ]),
    );
  });

  it("throws when periodization insert fails", async () => {
    const chain = makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "constraint violation" } }),
    });
    mockFrom.mockReturnValue(chain);

    await expect(saveStudentCoachPlan("student-1", "sessao-1", workout, nutrition)).rejects.toThrow(
      "Failed to save student plan",
    );
  });

  it("throws when training plans insert fails", async () => {
    const periodChain = makeChain({
      single: vi.fn().mockResolvedValue({ data: { id: "period-xyz" }, error: null }),
    });
    const plansChain = makeChain();
    (plansChain.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    });

    mockFrom.mockReturnValueOnce(periodChain).mockReturnValueOnce(plansChain);

    await expect(saveStudentCoachPlan("student-1", "sessao-1", workout, nutrition)).rejects.toThrow(
      "Failed to save plan days",
    );
  });
});
