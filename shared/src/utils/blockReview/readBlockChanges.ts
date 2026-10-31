import { INJURY_REGIONS, MAIN_GOALS } from "../../data/anamnesisAdaptive";
import { TRAINING_PLACES } from "../trainingPlace";
import { BLOCK_TRAINING_DAYS } from "./constants";
import type { BlockChanges } from "./types";

const PLACES: readonly string[] = Object.values(TRAINING_PLACES);

const isOneOf = (value: unknown, options: readonly unknown[]): boolean => options.includes(value);

/**
 * As mudanças da reavaliação, conferidas uma a uma: o que vier fora das opções
 * da tela recusa o pedido inteiro, em vez de gravar meio pedido na anamnese.
 *
 * @example readBlockChanges({ gym_type: "Academia completa" }) // { gym_type: "Academia completa" }
 * @example readBlockChanges({ training_days: 9 }) // null
 */
export function readBlockChanges(input: unknown): BlockChanges | null {
  if (input === undefined || input === null) return {};
  if (typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const changes: BlockChanges = {};
  if ("main_goal" in raw) {
    if (!isOneOf(raw.main_goal, MAIN_GOALS)) return null;
    changes.main_goal = raw.main_goal as BlockChanges["main_goal"];
  }
  if ("training_days" in raw) {
    if (!isOneOf(raw.training_days, BLOCK_TRAINING_DAYS)) return null;
    changes.training_days = raw.training_days as number;
  }
  if ("gym_type" in raw) {
    if (!isOneOf(raw.gym_type, PLACES)) return null;
    changes.gym_type = raw.gym_type as BlockChanges["gym_type"];
  }
  if ("level" in raw) {
    if (raw.level !== "intermediate") return null;
    changes.level = "intermediate";
  }
  if ("injuries" in raw) {
    const regions = raw.injuries;
    if (!Array.isArray(regions) || !regions.every((r) => isOneOf(r, INJURY_REGIONS))) return null;
    changes.injuries = [...new Set(regions)] as BlockChanges["injuries"];
  }
  return changes;
}

/**
 * As respostas da anamnese com as mudanças por cima. A lesão vai como o
 * onboarding grava: se há, e onde.
 *
 * @example answersWithChanges({ training_days: 3 }, { training_days: 4 }) // { training_days: 4 }
 */
export function answersWithChanges(
  answers: Record<string, unknown>,
  changes: BlockChanges,
): Record<string, unknown> {
  // O nível não é resposta da anamnese: mora no perfil (`persona_track`).
  const { injuries, level: _level, ...rest } = changes;
  const injury =
    injuries === undefined ? {} : { injury_reported: injuries.length > 0, injuries: [...injuries] };
  return { ...answers, ...rest, ...injury };
}
