"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/modules/auth";
import { ManualKeyDisclosure } from "@/modules/auth/components/ManualKeyDisclosure";
import { QrCodeBlock } from "@/modules/auth/components/QrCodeBlock";
import { TotpCodeForm } from "@/modules/auth/components/TotpCodeForm";
import { useTotpEnrollment } from "@/modules/auth/hooks/useTotpEnrollment";
import { Button } from "@/shared/components/ui/Button";

export default function MfaPage() {
  const router = useRouter();
  const { challenge, code, setCode, loading, error, prepareChallenge, confirmCode } =
    useTotpEnrollment({
      onVerified: () =>
        router.replace(useAuthStore.getState().accountType === "admin" ? "/admin" : "/dashboard"),
    });

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">Proteja sua conta</h1>
          <p className="text-sm text-muted-foreground">
            Use um aplicativo autenticador, como Google Authenticator, Microsoft Authenticator ou
            Authy, para concluir o acesso.
          </p>
          <p className="text-xs text-muted-foreground">
            Se uma configuração anterior foi interrompida, gere um novo QR Code.
          </p>
        </header>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {!challenge ? (
          <Button fullWidth isLoading={loading} onClick={prepareChallenge}>
            Configurar autenticador
          </Button>
        ) : (
          <TotpCodeForm
            code={code}
            hasQrCode={Boolean(challenge.qrCode)}
            loading={loading}
            onChangeCode={setCode}
            onSubmit={(event) => {
              event.preventDefault();
              void confirmCode();
            }}
          >
            {challenge.qrCode ? <QrCodeBlock qrCode={challenge.qrCode} /> : null}
            {challenge.secret ? <ManualKeyDisclosure secret={challenge.secret} /> : null}
          </TotpCodeForm>
        )}
      </section>
    </main>
  );
}
