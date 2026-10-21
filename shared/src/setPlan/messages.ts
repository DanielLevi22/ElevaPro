import { MAX_SEGMENTS, MAX_SETS, MAX_TARGET_RIR, MIN_TARGET_RIR } from "./constants";

export const UNKNOWN_METHOD = (received: unknown) =>
  `Técnica "${String(received)}" fora do catálogo. Use um identificador de TRAINING_METHODS.`;

export const TOO_MANY_SETS = (received: number) =>
  `Plano com ${received} séries; o limite é ${MAX_SETS}.`;

export const TOO_MANY_SEGMENTS = (received: number) =>
  `Série com ${received} segmentos; o limite é ${MAX_SEGMENTS}.`;

export const TARGET_RIR_OUT_OF_RANGE = (received: unknown) =>
  `RIR alvo ${String(received)} fora da faixa; use de ${MIN_TARGET_RIR} a ${MAX_TARGET_RIR} ou null.`;

export const UNKNOWN_FIELD = (keys: string[]) =>
  `Campo "${keys.join(", ")}" fora do formato do plano de séries. Campo novo passa pelo /lgpd-check antes de entrar.`;

export const INVERTED_REPS_RANGE = (received: unknown) => {
  const range = received as { min?: unknown; max?: unknown };
  return `Faixa de ${String(range.min)} a ${String(range.max)} repetições está invertida; o mínimo vem antes do máximo (8 a 12).`;
};
