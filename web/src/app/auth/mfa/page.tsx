"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { beginTotpChallenge, type TotpChallenge, useAuthStore, verifyTotp } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";

export default function MfaPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<TotpChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function beginChallenge(): Promise<void> {
    setLoading(true);
    setError("");
    try {
      setChallenge(await beginTotpChallenge());
    } catch {
      setError("Não foi possível preparar seu autenticador. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmChallenge(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!challenge || !/^\d{6}$/.test(code)) {
      setError("Digite o código de 6 dígitos do seu autenticador.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await verifyTotp(challenge.factorId, code);
      router.replace(useAuthStore.getState().accountType === "admin" ? "/admin" : "/dashboard");
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

        {!challenge ? (
          <Button fullWidth isLoading={loading} onClick={beginChallenge}>
            Configurar autenticador
          </Button>
        ) : (
          <form className="space-y-5" onSubmit={confirmChallenge}>
            {challenge.qrCode ? (
              <Image
                alt="QR Code para configurar o autenticador"
                className="mx-auto h-52 w-52"
                height={208}
                src={challenge.qrCode}
                unoptimized
                width={208}
              />
            ) : null}
            <p className="text-center text-sm text-muted-foreground">
              {challenge.qrCode
                ? "Escaneie o QR Code no seu aplicativo autenticador e informe o código gerado."
                : "Informe o código gerado no seu aplicativo autenticador."}
            </p>
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
