import type { BriefingSignal, BriefingSignalKind } from '@elevapro/shared';

/**
 * O que o balão de risco pode guardar localmente para lembrar "já mostrei".
 *
 * Deliberadamente sem `message` nem `studentName`: são inferência de saúde em
 * texto claro, e o dedupe roda no aparelho, não no servidor.
 */
export interface SeenRiskSignal {
  kind: BriefingSignalKind;
  days: number;
}

export function toSeenRiskSignal(signal: BriefingSignal): SeenRiskSignal {
  return { kind: signal.kind, days: signal.days };
}

export function shouldShowRiskBanner(
  current: SeenRiskSignal | null,
  lastSeen: SeenRiskSignal | null
): boolean {
  if (!current) return false;
  if (!lastSeen) return true;

  return current.kind !== lastSeen.kind || current.days !== lastSeen.days;
}
