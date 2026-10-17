import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  type NoticeState,
  planNotices,
  usualWorkoutMinutes,
  victoryCopy,
} from "..";

// 2026-10-14 é quarta.
const TODAY = "2026-10-14";
const at = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

function state(over: Partial<NoticeState> = {}): NoticeState {
  return {
    today: TODAY,
    nowMinutes: at("08:00"),
    meals: [
      { id: "almoco", name: "Almoço", time: "12:00", dayOfWeek: null },
      { id: "jantar", name: "Jantar", time: "19:30", dayOfWeek: null },
    ],
    loggedMealIds: [],
    workouts: [{ id: "treino-b", title: "Treino B - Costas e Bíceps", day: "wednesday" }],
    trainedToday: false,
    workoutStarts: [],
    rests: [],
    lastWorkoutDate: null,
    workoutsThisWeek: 0,
    checkInDue: false,
    healthConsent: true,
    ...over,
  };
}

const prefs = { ...DEFAULT_PREFERENCES, hideDetails: false };
/** Os avisos do dia e do reengajamento, sem o relatório de domingo, testado à parte. */
const withoutReport = (notices: ReturnType<typeof planNotices>) =>
  notices.filter((notice) => notice.kind !== "weeklyReport");
const todayOf = (notices: ReturnType<typeof planNotices>) =>
  notices.filter((notice) => notice.date === TODAY);

describe("planNotices", () => {
  it("avisa a refeição 1h30 depois e o treino 30 min depois do horário padrão", () => {
    const today = todayOf(planNotices(state(), prefs));
    expect(today.map((notice) => [notice.title, notice.minutes])).toEqual([
      ["Almoço ainda não marcado", at("13:30")],
      ["Treino B ainda dá tempo hoje", at("18:30")],
      ["Jantar ainda não marcado", at("21:00")],
    ]);
  });

  it("o que já foi feito, ou cujo horário passou, não avisa", () => {
    const today = todayOf(
      planNotices(
        state({ nowMinutes: at("14:00"), loggedMealIds: ["jantar"], trainedToday: true }),
        prefs,
      ),
    );
    expect(today).toEqual([]);
  });

  it("o treino só avisa em dia de treino", () => {
    const thursday = planNotices(state(), prefs).filter((notice) => notice.date === "2026-10-15");
    expect(thursday.map((notice) => notice.kind)).toEqual(["meal", "meal"]);
  });

  it("aprende o horário pela mediana dos inícios, e o fixo vale acima dele", () => {
    const starts = [at("06:30"), at("07:00"), at("07:10")];
    expect(usualWorkoutMinutes(starts)).toBe(at("07:00"));
    expect(usualWorkoutMinutes(starts.slice(0, 2))).toBe(at("18:00"));
    const learned = todayOf(
      planNotices(state({ nowMinutes: at("06:00"), workoutStarts: starts, meals: [] }), prefs),
    );
    expect(learned[0].minutes).toBe(at("07:30"));
    const fixed = todayOf(
      planNotices(state({ workoutStarts: starts, meals: [] }), {
        ...prefs,
        workoutMode: "fixed",
        workoutTime: "12:00",
      }),
    );
    expect(fixed[0].minutes).toBe(at("12:30"));
  });

  it("respeita o silêncio e o limite do dia, os mais cedo primeiro", () => {
    const meals = ["07:00", "10:00", "13:00", "16:00", "21:00"].map((time) => ({
      id: time,
      name: "Lanche",
      time,
      dayOfWeek: null,
    }));
    const today = todayOf(planNotices(state({ nowMinutes: 0, meals, workouts: [] }), prefs));
    // 21:00 + 1h30 cai no silêncio; dos quatro que sobram, ficam três.
    expect(today.map((notice) => notice.minutes)).toEqual([at("08:30"), at("11:30"), at("14:30")]);
  });

  it("no limite, o treino tem lugar antes das refeições", () => {
    const meals = ["07:00", "09:00", "11:00", "13:00"].map((time) => ({
      id: time,
      name: "Lanche",
      time,
      dayOfWeek: null,
    }));
    const today = todayOf(planNotices(state({ nowMinutes: 0, meals }), prefs));
    expect(today.map((notice) => notice.kind)).toEqual(["meal", "meal", "workout"]);
  });

  it("em Modo Descanso não avisa, até a volta", () => {
    const rests = [{ id: "r", starts_on: TODAY, planned_until: "2026-10-16", ended_on: null }];
    const days = new Set(planNotices(state({ rests }), prefs).map((notice) => notice.date));
    expect([...days].sort()[0]).toBe("2026-10-17");
    const unknown = [{ ...rests[0], planned_until: null }];
    expect(planNotices(state({ rests: unknown }), prefs)).toEqual([]);
  });

  it("agenda uma semana, e o tipo desligado não avisa", () => {
    const notices = withoutReport(planNotices(state(), { ...prefs, meal: false }));
    // O treino de quarta e, três dias sem treino depois de abrir o app, o F4.
    expect(notices.map((notice) => notice.kind)).toEqual(["workout", "comeback"]);
  });

  it("com detalhes escondidos, nada do plano vai para a tela bloqueada (LGPD)", () => {
    const notices = planNotices(state(), DEFAULT_PREFERENCES);
    expect(notices[1].title).toBe("Você tem 2 pendências de hoje");
    const text = notices.map((notice) => `${notice.title} ${notice.body}`).join(" ");
    for (const leaked of [
      "Almoço",
      "Jantar",
      "Treino",
      "Costas",
      "Bíceps",
      "kcal",
      "kg",
      "refeição",
      "treino",
    ]) {
      expect(text).not.toContain(leaked);
    }
  });

  it("sem treino: um aviso no 3º dia, a pergunta no 7º, e depois silêncio", () => {
    const notices = withoutReport(
      planNotices(state({ lastWorkoutDate: "2026-10-12", meals: [] }), prefs),
    );
    expect(notices.map((notice) => [notice.date, notice.kind])).toEqual([
      ["2026-10-14", "workout"],
      ["2026-10-15", "comeback"],
      ["2026-10-19", "busyWeek"],
    ]);
    expect(notices[2].title).toBe("Semana corrida?");
  });

  it("passada a pergunta, abrir o app recomeça a conta de hoje", () => {
    const notices = withoutReport(
      planNotices(state({ lastWorkoutDate: "2026-09-30", meals: [] }), prefs),
    );
    expect(notices.map((notice) => notice.kind)).toEqual(["workout", "comeback"]);
    expect(notices[1].date).toBe("2026-10-17");
  });
});

describe("os avisos de texto fixo", () => {
  const kindsOn = (notices: ReturnType<typeof planNotices>, day: string) =>
    notices.filter((notice) => notice.date === day).map((notice) => [notice.kind, notice.minutes]);

  it("o relatório chega no domingo às 18h (R0)", () => {
    const sunday = kindsOn(planNotices(state({ meals: [], workouts: [] }), prefs), "2026-10-18");
    expect(sunday).toEqual([["weeklyReport", at("18:00")]]);
  });

  it("o check-in pendente lembra de manhã até a semana fechar", () => {
    const notices = planNotices(state({ meals: [], workouts: [], checkInDue: true }), prefs);
    const mornings = notices
      .filter((notice) => notice.kind === "checkIn")
      .map((notice) => notice.date);
    // São 8h: o de hoje ainda vem às 9h; depois do domingo, a semana fecha.
    expect(mornings).toEqual([
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
  });

  it("o lembrete das 20h só para quem ligou, e só com o consentimento de saúde", () => {
    const off = planNotices(state({ meals: [], workouts: [] }), prefs);
    expect(off.some((notice) => notice.kind === "dailyLog")).toBe(false);

    const on = planNotices(state({ meals: [], workouts: [] }), { ...prefs, dailyLog: true });
    expect(kindsOn(on, "2026-10-15")).toEqual([["dailyLog", at("20:00")]]);

    const revoked = planNotices(state({ meals: [], workouts: [], healthConsent: false }), {
      ...prefs,
      dailyLog: true,
    });
    expect(revoked.some((notice) => notice.kind === "dailyLog")).toBe(false);
  });

  // #344: revogado o consentimento de saúde, o que depende dele para de avisar.
  it("sem o consentimento de saúde, a refeição não avisa", () => {
    const notices = planNotices(state({ healthConsent: false }), prefs);
    if (notices.some((notice) => notice.kind === "meal")) {
      throw new Error("AVISO SEM CONSENTIMENTO: a refeição avisou com o consentimento revogado");
    }
    expect(notices.some((notice) => notice.kind === "workout")).toBe(true);
  });

  it("o relatório e o lembrete também respeitam o Modo Descanso e o limite do dia", () => {
    const rests = [
      { id: "r", starts_on: "2026-10-14", planned_until: "2026-10-20", ended_on: null },
    ];
    expect(planNotices(state({ rests }), { ...prefs, dailyLog: true })).toEqual([]);

    const limited = planNotices(state({ checkInDue: true }), {
      ...prefs,
      dailyLimit: 1,
      dailyLog: true,
    });
    const byDay = new Map<string, number>();
    for (const notice of limited) byDay.set(notice.date, (byDay.get(notice.date) ?? 0) + 1);
    expect(Math.max(...byDay.values())).toBe(1);
  });
});

describe("victoryCopy", () => {
  const record = { name: "Supino", text: "45 kg → 47,5 kg" };

  it("o marco vem antes de tudo: o 10º, o 25º, o 50º treino (F1)", () => {
    expect(
      victoryCopy({ record, weekDone: 4, weekTarget: 4, totalWorkouts: 50 }, false)?.title,
    ).toBe("Treino número 50!");
  });

  it("comemora a semana que fecha, e depois o recorde", () => {
    expect(
      victoryCopy({ record, weekDone: 4, weekTarget: 4, totalWorkouts: 7 }, false)?.title,
    ).toBe("Semana completa: 4 de 4");
    expect(
      victoryCopy({ record, weekDone: 5, weekTarget: 4, totalWorkouts: 8 }, false)?.title,
    ).toBe("Recorde: Supino");
    expect(
      victoryCopy({ record: null, weekDone: 2, weekTarget: 4, totalWorkouts: 9 }, false),
    ).toBeNull();
  });

  it("sem detalhes, nem o exercício nem a carga (LGPD)", () => {
    const text = [
      victoryCopy({ record, weekDone: 4, weekTarget: 4, totalWorkouts: 7 }, true),
      victoryCopy({ record, weekDone: 1, weekTarget: 4, totalWorkouts: 7 }, true),
      victoryCopy({ record, weekDone: 1, weekTarget: 4, totalWorkouts: 50 }, true),
    ]
      .map((copy) => `${copy?.title} ${copy?.body}`)
      .join(" ");
    for (const leaked of ["Supino", "kg", "45", "4 de 4", "50"]) expect(text).not.toContain(leaked);
  });
});
