"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  hasCurrentPrivilegedProof,
  hasLegacyTotpFactor,
  isPasskeyEnabled,
  registerPasskey,
  signInWithPasskey,
  useAuthStore,
} from "@/modules/auth";
import { ManualKeyDisclosure } from "@/modules/auth/components/ManualKeyDisclosure";
import { QrCodeBlock } from "@/modules/auth/components/QrCodeBlock";
import { TotpCodeForm } from "@/modules/auth/components/TotpCodeForm";
import { useTotpEnrollment } from "@/modules/auth/hooks/useTotpEnrollment";
import { Button } from "@/shared/components/ui/Button";

export default function MfaPage() {
  const router = useRouter();
  const passkeyEnabled = isPasskeyEnabled();
  const [legacyFactor, setLegacyFactor] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [verifiedLegacy, setVerifiedLegacy] = useState(false);
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const destination = () =>
    useAuthStore.getState().accountType === "admin" ? "/admin" : "/dashboard";
  const { challenge, code, setCode, loading, error, prepareChallenge, confirmCode } =
    useTotpEnrollment({
      onVerified: () => {
        if (passkeyEnabled) setVerifiedLegacy(true);
        else router.replace(destination());
      },
    });

  const handleDeviceSetup = async () => {
    setShowDeviceSetup(true);
    try {
      setLegacyFactor(await hasLegacyTotpFactor());
    } catch {
      setLegacyFactor(false);
    }
  };

  const handleRegister = async () => {
    setPasskeyLoading(true);
    setPasskeyError("");
    try {
      await registerPasskey();
      setRegistered(true);
    } catch (err: unknown) {
      setPasskeyError(
        err instanceof Error ? err.message : "Não foi possível cadastrar o aparelho.",
      );
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSignIn = async () => {
    setPasskeyLoading(true);
    setPasskeyError("");
    try {
      await signInWithPasskey();
      if (!(await hasCurrentPrivilegedProof()))
        throw new Error("Prova do aparelho ausente na sessão.");
      router.replace(destination());
    } catch (err: unknown) {
      setPasskeyError(
        err instanceof Error ? err.message : "Não foi possível verificar o aparelho.",
      );
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {passkeyEnabled ? "Proteja sua conta com o aparelho" : "Proteja sua conta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {passkeyEnabled
              ? "Cadastre uma Passkey para entrar com Face ID, biometria ou PIN do seu aparelho."
              : "Confirme o código do seu aplicativo autenticador para concluir o acesso."}
          </p>
        </header>

        {passkeyError ? (
          <p className="text-sm text-destructive" role="alert">
            {passkeyError}
          </p>
        ) : null}
        {passkeyEnabled && !verifiedLegacy ? (
          <Button fullWidth isLoading={passkeyLoading} onClick={handleSignIn}>
            Entrar com Face ID ou PIN
          </Button>
        ) : null}
        {passkeyEnabled && registered && verifiedLegacy ? (
          <Button fullWidth isLoading={passkeyLoading} onClick={handleSignIn}>
            Entrar com o aparelho cadastrado
          </Button>
        ) : passkeyEnabled && verifiedLegacy ? (
          <Button fullWidth isLoading={passkeyLoading} onClick={handleRegister}>
            Cadastrar Face ID ou PIN
          </Button>
        ) : null}

        {passkeyEnabled && !showDeviceSetup && !verifiedLegacy ? (
          <Button fullWidth variant="ghost" onClick={handleDeviceSetup}>
            Cadastrar ou trocar aparelho
          </Button>
        ) : null}

        {verifiedLegacy && !passkeyEnabled ? (
          <Button fullWidth onClick={() => router.replace(destination())}>
            Continuar com a sessão atual
          </Button>
        ) : null}

        {!verifiedLegacy && (!passkeyEnabled || showDeviceSetup) ? (
          <div className="space-y-4 border-t border-white/10 pt-4">
            <p className="text-sm text-muted-foreground">
              {passkeyEnabled
                ? legacyFactor
                  ? "Confirme o código apenas para cadastrar ou substituir um aparelho. No login diário, use a Passkey."
                  : "Na primeira ativação, configure o autenticador uma vez para proteger o cadastro de aparelhos."
                : "Use o código do seu aplicativo autenticador."}
            </p>
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
          </div>
        ) : null}
        <Button
          fullWidth
          variant="ghost"
          onClick={() => {
            void useAuthStore
              .getState()
              .signOut()
              .then(() => router.replace("/auth/login"));
          }}
        >
          Sair
        </Button>
      </section>
    </main>
  );
}
