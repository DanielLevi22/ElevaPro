import { MAX_SETS } from "./constants";
import type { RepsTarget, SetPlan, SetPrescription, SimplePrescription } from "./types";

interface SimplePrescriptionConversion {
  plan: SetPlan;
  /** O que não coube no plano e precisa ir para a observação, ou `null`. */
  leftoverNote: string | null;
}

interface ParsedReps {
  reps: RepsTarget;
  /** O texto original, quando ele dizia mais do que o modo guardou. */
  leftover: string | null;
}

// "8-12", "8 a 12" e "8 – 12": as três grafias que o campo livre acumulou.
const RANGE = /^(\d+)\s*(?:-|–|a)\s*(\d+)$/;
const COUNT = /^\d+$/;
const TIME = /^(\d+)\s*(s|seg|min)$/i;
const SECONDS_PER_MINUTE = 60;
const FAILURE = /^(?:até\s+(?:a\s+)?)?falha$/i;
const LEADING_NUMBER = /^(\d+)/;
// Zero era campo não preenchido, não meta: "0" e "0s" viram "até a falha".
const ZERO = /^0+\s*(?:s|seg)?$/i;
const KILOS = /^(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i;

interface ParsedWeight {
  weight_kg: number | null;
  leftover: string | null;
}

/**
 * Converte a prescrição achatada (`3 × 12, 20 kg, 60 s`) em séries Normal iguais.
 * Serve à migração dos itens antigos (0106) e à IA, que ainda propõe nesse formato.
 *
 * @example simplePrescriptionToSetPlan({ sets: 3, reps: "12", weight: "20", rest_seconds: 60 }).plan.length // 3
 */
export function simplePrescriptionToSetPlan(
  simple: SimplePrescription,
): SimplePrescriptionConversion {
  const { reps, leftover: repsLeftover } = parseReps(simple.reps);
  const { weight_kg, leftover: weightLeftover } = parseWeight(simple.weight);
  const set: SetPrescription = {
    methods: ["working"],
    reps,
    weight_kg,
    rest_seconds: simple.rest_seconds,
    target_rir: null,
    segments: [],
  };
  const sets = simple.sets ?? 0;
  // O limite do plano e o CHECK do banco param em MAX_SETS; o número original
  // segue na observação.
  const setsLeftover = sets > MAX_SETS ? String(sets) : null;
  return {
    // Cópia por série: o mesmo objeto nas N posições faria editar uma editar todas.
    plan: Array.from({ length: Math.min(sets, MAX_SETS) }, () => structuredClone(set)),
    leftoverNote: joinLeftovers([
      ["Séries", setsLeftover],
      ["Repetições", repsLeftover],
      ["Carga", weightLeftover],
    ]),
  };
}

function joinLeftovers(entries: [string, string | null][]): string | null {
  const parts = entries.filter(([, text]) => text).map(([label, text]) => `${label}: ${text}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// "0" era o padrão do formulário para carga não preenchida, não zero quilo.
export function parseWeight(raw: string | null): ParsedWeight {
  const text = (raw ?? "").trim();
  const kilos = KILOS.exec(text);
  if (!kilos) return { weight_kg: null, leftover: text || null };
  const value = Number(kilos[1]?.replace(",", "."));
  return { weight_kg: value > 0 ? value : null, leftover: null };
}

export function parseReps(raw: string | null): ParsedReps {
  const text = (raw ?? "").trim();
  if (!text || ZERO.test(text)) return { reps: { mode: "failure" }, leftover: null };
  if (COUNT.test(text)) return { reps: { mode: "count", value: Number(text) }, leftover: null };
  if (FAILURE.test(text)) return { reps: { mode: "failure" }, leftover: null };
  const range = RANGE.exec(text);
  if (range && Number(range[1]) > 0) {
    return {
      reps: { mode: "range", min: Number(range[1]), max: Number(range[2]) },
      leftover: null,
    };
  }
  const time = TIME.exec(text);
  if (time) {
    const factor = time[2]?.toLowerCase() === "min" ? SECONDS_PER_MINUTE : 1;
    return { reps: { mode: "time", seconds: Number(time[1]) * factor }, leftover: null };
  }
  return parseFreeText(text);
}

// Sem número para ler, a série vira "até a falha" — o único modo que não
// inventa uma meta — e a frase inteira segue na observação.
function parseFreeText(text: string): ParsedReps {
  const leading = LEADING_NUMBER.exec(text);
  const value = Number(leading?.[1] ?? 0);
  const reps: RepsTarget = value > 0 ? { mode: "count", value } : { mode: "failure" };
  return { reps, leftover: text || null };
}

interface FlatColumnsRow extends SimplePrescription {
  notes: string | null;
}

/**
 * Um item antigo pronto para a 0106: o plano convertido e a observação com a
 * sobra (o texto que não coube em nenhum modo) somada ao que já havia.
 *
 * @example setPlanFromFlatColumns(linha) // { set_plan: [...], notes: "Joelho alinhado · Carga: corporal" }
 */
export function setPlanFromFlatColumns(row: FlatColumnsRow): {
  set_plan: SetPlan;
  notes: string | null;
} {
  const { plan, leftoverNote } = simplePrescriptionToSetPlan(row);
  const notes = [row.notes, leftoverNote].filter(Boolean).join(" · ");
  return { set_plan: plan, notes: notes || null };
}
