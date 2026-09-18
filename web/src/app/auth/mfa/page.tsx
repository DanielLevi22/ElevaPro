"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { enrollTotp, type TotpEnrollment, verifyTotp } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";

export default function MfaPage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function beginEnrollment(): Promise<void> {
    setLoading(true);
    setError("");
    try {
      setEnrollment(await enrollTotp());
    } catch {
      setError("Não foi possível preparar seu autenticador. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmEnrollment(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!enrollment || !/^\d{6}$/.test(code)) {
      setError("Digite o código de 6 dígitos do seu autenticador.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await verifyTotp(enrollment.factorId, code);
      router.replace("/dashboard");
    } catch {
      setError("Código inválido ou expirado. Gere um novo código e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">Proteja sua conta</h1>
          <p className="text-sm text-muted-foreground">
            Use um aplicativo autenticador para concluir o acesso.
          </p>
        </header>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {!enrollment ? (
          <Button fullWidth isLoading={loading} onClick={beginEnrollment}>
            Configurar autenticador
          </Button>
        ) : (
          <form className="space-y-5" onSubmit={confirmEnrollment}>
            <Image
              alt="QR Code para configurar o autenticador"
              className="mx-auto h-52 w-52"
              height={208}
              src={enrollment.qrCode}
              unoptimized
              width={208}
            />
            <label className="block text-sm font-medium text-foreground" htmlFor="totp-code">
              Código do autenticador
            </label>
            <input
              autoComplete="one-time-code"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center tracking-[0.5em] text-foreground"
              id="totp-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              value={code}
            />
            <Button fullWidth isLoading={loading} type="submit">
              Confirmar código
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
