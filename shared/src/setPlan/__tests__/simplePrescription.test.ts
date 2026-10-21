import { describe, expect, it } from "vitest";
import { setPlanFromFlatColumns, simplePrescriptionToSetPlan, validateSetPlan } from "..";

describe("simplePrescriptionToSetPlan — do formato achatado para o plano de séries", () => {
  it("três séries de 12 com 20 kg e 60 s viram três séries Normal iguais", () => {
    const { plan, leftoverNote } = simplePrescriptionToSetPlan({
      sets: 3,
      reps: "12",
      weight: "20",
      rest_seconds: 60,
    });

    const normal = {
      methods: ["working"],
      reps: { mode: "count", value: 12 },
      weight_kg: 20,
      rest_seconds: 60,
      target_rir: null,
      segments: [],
    };
    expect(plan).toEqual([normal, normal, normal]);
    expect(leftoverNote).toBeNull();
  });

  it.each(["8-12", "8 a 12", "8 – 12"])("lê %s como faixa de 8 a 12", (reps) => {
    const { plan } = simplePrescriptionToSetPlan({
      sets: 1,
      reps,
      weight: null,
      rest_seconds: null,
    });
    expect(plan[0]?.reps).toEqual({ mode: "range", min: 8, max: 12 });
  });

  it.each(["falha", "Até a falha", "até falha"])("lê %s como até a falha", (reps) => {
    const { plan } = simplePrescriptionToSetPlan({
      sets: 1,
      reps,
      weight: null,
      rest_seconds: null,
    });
    expect(plan[0]?.reps).toEqual({ mode: "failure" });
  });

  it.each([
    ["10 min", 600],
    ["2min", 120],
  ])("lê %s como %d segundos", (reps, seconds) => {
    const { plan, leftoverNote } = simplePrescriptionToSetPlan({
      sets: 1,
      reps,
      weight: null,
      rest_seconds: null,
    });
    expect(plan[0]?.reps).toEqual({ mode: "time", seconds });
    expect(leftoverNote).toBeNull();
  });

  it.each(["30s", "30 s", "30 seg"])("lê %s como 30 segundos", (reps) => {
    const { plan } = simplePrescriptionToSetPlan({
      sets: 1,
      reps,
      weight: null,
      rest_seconds: null,
    });
    expect(plan[0]?.reps).toEqual({ mode: "time", seconds: 30 });
  });

  // O texto livre não pode se perder na conversão: o número que dá para ler
  // vira a meta, e a frase inteira vai para a observação.
  it("guarda na observação a repetição que não cabe em nenhum modo", () => {
    const { plan, leftoverNote } = simplePrescriptionToSetPlan({
      sets: 2,
      reps: "10 cada perna",
      weight: null,
      rest_seconds: null,
    });
    expect(plan[0]?.reps).toEqual({ mode: "count", value: 10 });
    expect(leftoverNote).toBe("Repetições: 10 cada perna");
  });

  // Zero repetição não é meta: era campo não preenchido. Virar `count: 0`
  // faria o schema recusar o item e a gravação dos editores atuais falhar.
  it.each(["0", "0s", "", null])("trata a repetição %j como não prescrita", (reps) => {
    const { plan, leftoverNote } = simplePrescriptionToSetPlan({
      sets: 1,
      reps,
      weight: null,
      rest_seconds: null,
    });
    expect(plan[0]?.reps).toEqual({ mode: "failure" });
    expect(leftoverNote).toBeNull();
    expect(() => validateSetPlan(plan)).not.toThrow();
  });

  it.each([
    ["20kg", 20],
    ["20 kg", 20],
    ["22,5", 22.5],
    ["22.5", 22.5],
  ])("lê o peso %s como %d kg", (weight, kg) => {
    const { plan } = simplePrescriptionToSetPlan({
      sets: 1,
      reps: "10",
      weight,
      rest_seconds: null,
    });
    expect(plan[0]?.weight_kg).toBe(kg);
  });

  // "0" era o padrão do formulário quando o especialista não preenchia a carga,
  // não uma prescrição de zero quilo: vira "o aluno escolhe".
  it.each(["0", "", null])("trata o peso %j como carga não prescrita", (weight) => {
    const { plan, leftoverNote } = simplePrescriptionToSetPlan({
      sets: 1,
      reps: "10",
      weight,
      rest_seconds: null,
    });
    expect(plan[0]?.weight_kg).toBeNull();
    expect(leftoverNote).toBeNull();
  });

  it("guarda na observação o peso que não é número", () => {
    const { plan, leftoverNote } = simplePrescriptionToSetPlan({
      sets: 1,
      reps: "10",
      weight: "corporal",
      rest_seconds: null,
    });
    expect(plan[0]?.weight_kg).toBeNull();
    expect(leftoverNote).toBe("Carga: corporal");
  });

  it("junta na observação a repetição e o peso que não couberam", () => {
    const { leftoverNote } = simplePrescriptionToSetPlan({
      sets: 1,
      reps: "10 cada perna",
      weight: "elástico verde",
      rest_seconds: null,
    });
    expect(leftoverNote).toBe("Repetições: 10 cada perna · Carga: elástico verde");
  });

  // O limite do plano é 20 séries, e o CHECK do banco recusaria mais: a
  // conversão para no limite e deixa o número original na observação.
  it("acima de 20 séries, para no limite e registra o original", () => {
    const { plan, leftoverNote } = simplePrescriptionToSetPlan({
      sets: 25,
      reps: "10",
      weight: null,
      rest_seconds: null,
    });
    expect(plan).toHaveLength(20);
    expect(leftoverNote).toBe("Séries: 25");
  });

  it("texto que começa em zero não vira meta de zero repetição", () => {
    const { plan } = simplePrescriptionToSetPlan({
      sets: 1,
      reps: "0 cada perna",
      weight: null,
      rest_seconds: null,
    });
    expect(() => validateSetPlan(plan)).not.toThrow();
  });

  // A execução de hoje mostra zero séries quando `sets` é nulo; a conversão
  // não inventa séries que o especialista não prescreveu.
  it("sem número de séries, o plano fica vazio", () => {
    expect(
      simplePrescriptionToSetPlan({ sets: null, reps: "12", weight: null, rest_seconds: 60 }).plan,
    ).toEqual([]);
  });
});

describe("setPlanFromFlatColumns — o item antigo pronto para gravar (0106)", () => {
  it("devolve o plano e junta a sobra à observação que já existia", () => {
    expect(
      setPlanFromFlatColumns({
        sets: 2,
        reps: "10 cada perna",
        weight: "corporal",
        rest_seconds: 45,
        notes: "Joelho alinhado",
      }),
    ).toEqual({
      set_plan: simplePrescriptionToSetPlan({
        sets: 2,
        reps: "10 cada perna",
        weight: "corporal",
        rest_seconds: 45,
      }).plan,
      notes: "Joelho alinhado · Repetições: 10 cada perna · Carga: corporal",
    });
  });

  it("sem sobra, a observação fica como estava", () => {
    const { notes } = setPlanFromFlatColumns({
      sets: 3,
      reps: "12",
      weight: "20",
      rest_seconds: 60,
      notes: null,
    });
    expect(notes).toBeNull();
  });
});
