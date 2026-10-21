import {
  MAX_SEGMENTS,
  MAX_SETS,
  type SetPlan,
  type SetPrescription,
  type SetSegment,
} from "@elevapro/shared";

/** A série de um exercício novo: Normal, 12 repetições, 60 s — o padrão de antes do plano. */
const DEFAULT_SET: SetPrescription = {
  methods: ["working"],
  reps: { mode: "count", value: 12 },
  weight_kg: null,
  rest_seconds: 60,
  target_rir: null,
  segments: [],
};

const DEFAULT_SEGMENT: SetSegment = {
  reps: { mode: "count", value: 4 },
  weight_kg: null,
  pause_seconds: 15,
  methods: [],
};

/** Exercício novo nasce com três séries Normal. */
export function defaultSetPlan(): SetPlan {
  return [structuredClone(DEFAULT_SET), structuredClone(DEFAULT_SET), structuredClone(DEFAULT_SET)];
}

/** "+ série" copia a última, com o descanso: é o "duplicar" do especialista. */
export function appendSet(plan: SetPlan): SetPlan {
  if (plan.length >= MAX_SETS) return plan;
  const last = plan.at(-1) ?? DEFAULT_SET;
  return [...plan, structuredClone(last)];
}

export function replaceSet(plan: SetPlan, index: number, set: SetPrescription): SetPlan {
  return plan.map((current, i) => (i === index ? set : current));
}

export function removeSet(plan: SetPlan, index: number): SetPlan {
  return plan.filter((_, i) => i !== index);
}

/** Marca ou desmarca um id na lista, mantendo a ordem dos que ficam. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((m) => m !== id) : [...ids, id];
}

export function toggleMethod(set: SetPrescription, id: string): SetPrescription {
  return { ...set, methods: toggleId(set.methods, id) };
}

/** Marca ou desmarca uma técnica só do bloco. */
export function toggleSegmentMethod(segment: SetSegment, id: string): SetSegment {
  return { ...segment, methods: toggleId(segment.methods, id) };
}

/** O segmento novo herda a carga da série: o drop e o rest-pause partem dela. */
export function appendSegment(set: SetPrescription): SetPrescription {
  if (set.segments.length >= MAX_SEGMENTS) return set;
  const last = set.segments.at(-1);
  const segment = last
    ? structuredClone(last)
    : { ...structuredClone(DEFAULT_SEGMENT), weight_kg: set.weight_kg };
  return { ...set, segments: [...set.segments, segment] };
}

/** Número digitado, ou `null` com o campo vazio. */
export function parseOptionalNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Peso zero ou negativo não é carga: vazio é "o aluno escolhe", e o schema recusa zero. */
export function asWeight(value: number | null): number | null {
  return value !== null && value > 0 ? value : null;
}

/** Segundos de descanso ou pausa: inteiro e nunca negativo, como o schema exige. */
export function asSeconds(value: number | null): number | null {
  return value === null ? null : Math.max(0, Math.round(value));
}

/** O mesmo descanso em todas as séries, sem mexer no resto. */
export function applyRestToAll(plan: SetPlan, rest: number | null): SetPlan {
  return plan.map((set) => ({ ...set, rest_seconds: rest }));
}
