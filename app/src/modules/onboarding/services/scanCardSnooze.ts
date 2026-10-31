/** Quem dispensou o cartão do escaneamento, e quando. */
export interface ScanCardDismissal {
  ownerId: string;
  at: number;
}

/** Dispensado, o cartão do escaneamento volta depois disto: lembrar não é cobrar. */
const SCAN_CARD_SNOOZE_MS = 30 * 86_400_000;

/**
 * Se o "Agora não" ainda esconde o cartão do escaneamento para esta conta.
 *
 * A dispensa guarda quem dispensou, e não depende do dono do onboarding no
 * aparelho: quem reinstala o app depois do onboarding não tem esse dono, e o
 * toque em "Agora não" não fazia nada.
 *
 * @example isScanCardSnoozed(estado.scanCardDismissal, user.id) // true por 30 dias
 */
export function isScanCardSnoozed(
  dismissal: ScanCardDismissal | null,
  studentId: string,
  now: number = Date.now()
): boolean {
  return (
    dismissal !== null &&
    dismissal.ownerId === studentId &&
    now - dismissal.at < SCAN_CARD_SNOOZE_MS
  );
}
