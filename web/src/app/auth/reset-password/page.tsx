"use client";

import { passwordValidationError } from "@elevapro/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { PasswordInput } from "@/shared/components/ui/PasswordInput";

/**
 * Destino do link de convite/recuperação (ADR-0035), para quem abre o e-mail
 * no computador em vez do celular. Ao abrir, cria a sessão que o link traz
 * (#359) e tira os tokens da barra de endereço; depois, falta só a senha.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const link = useInviteLink();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    const passwordError = passwordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      const result = await useAuthStore.getState().completeAccountInvite(password);
      if (!result.success) {
        setError(result.error || "O link pode ter expirado — peça um novo.");
        return;
      }
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative max-w-md w-full mx-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent tracking-tight">
              Defina sua senha
            </h1>
            <p className="text-muted-foreground text-sm">
              Só você vai conhecer essa senha — nem o seu especialista.
            </p>
          </div>

          {link.status === "checking" && (
            <p className="text-center text-sm text-muted-foreground">Abrindo seu convite…</p>
          )}
          {link.status === "invalid" && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
              Este link não vale mais ({link.error}). Peça ao seu especialista um novo convite.
            </div>
          )}

          <form
            className={link.status === "ready" ? "space-y-6" : "hidden"}
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Nova senha
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all backdrop-blur-sm"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground"
                >
                  Confirme a nova senha
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all backdrop-blur-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" size="lg" fullWidth isLoading={loading}>
              {loading ? "Confirmando..." : "Confirmar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

type InviteLink =
  | { status: "checking" }
  | { status: "ready" }
  | { status: "invalid"; error: string };

/**
 * Abre a sessão do link uma vez só: o React de desenvolvimento roda o efeito
 * duas vezes, e a segunda acharia a URL já limpa.
 */
function useInviteLink(): InviteLink {
  const [link, setLink] = useState<InviteLink>({ status: "checking" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void useAuthStore
      .getState()
      .openInviteLink(window.location.href)
      .then((result) => {
        // Os tokens saem da barra de endereço: não ficam no histórico do navegador.
        window.history.replaceState(null, "", window.location.pathname);
        setLink(
          result.success
            ? { status: "ready" }
            : { status: "invalid", error: result.error ?? "link inválido" },
        );
      });
  }, []);

  return link;
}
