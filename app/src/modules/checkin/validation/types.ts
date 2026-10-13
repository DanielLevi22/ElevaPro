import type { CheckInLogging } from '@elevapro/shared';

export interface CheckInInput {
  logging: CheckInLogging | null;
  /** Como a pessoa digitou: "77,6". */
  weight: string;
}

/** O Aluno não informa peso: com especialista, quem mede é ele (ADR-0030). */
export type CheckInFields = 'withWeight' | 'withoutWeight';

export type CheckInResult =
  | { status: 'ready'; logging: CheckInLogging; weightKg: number | null }
  | { status: 'incomplete'; hint: string }
  | { status: 'invalid'; error: string; hint: string };
