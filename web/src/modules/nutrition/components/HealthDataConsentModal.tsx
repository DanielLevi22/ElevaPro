"use client";

import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { useGrantHealthDataConsent } from "@/shared/hooks/useHealthDataConsent";

interface HealthDataConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function HealthDataConsentModal({ onAccept, onDecline }: HealthDataConsentModalProps) {
  const { mutateAsync: grantConsent, isPending } = useGrantHealthDataConsent();

  async function handleAccept() {
    await grantConsent();
    onAccept();
  }

  return (
    <Dialog
      open
      onClose={onDecline}
      title="Uso de dados de saúde"
      description="Para criar um plano alimentar, precisamos armazenar suas metas nutricionais (calorias, proteínas, carboidratos e gorduras)."
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-xl bg-surface-highlight/60 border border-overlay-08 p-4 flex flex-col gap-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">O que será armazenado:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Metas calóricas e de macronutrientes</li>
            <li>Refeições e alimentos do plano</li>
            <li>Registros de refeições realizadas</li>
          </ul>
          <p className="mt-2 text-xs">
            Base legal: Tutela da Saúde (Art. 11, II, f) + Consentimento (Art. 11, I) — LGPD. Você
            pode revogar este consentimento a qualquer momento nas configurações de privacidade.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button fullWidth onClick={handleAccept} isLoading={isPending}>
            {isPending ? "Registrando..." : "Aceitar e continuar"}
          </Button>
          <Button fullWidth variant="ghost" onClick={onDecline} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
