"use client";

import { isStrongAuthRequired, userFacingAuthError } from "@elevapro/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  hasCurrentPrivilegedProof,
  isPasskeyEnabled,
  signInWithPasskey,
  useAuthStore,
} from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { PasswordInput } from "@/shared/components/ui/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accountType = useAuthStore((state) => state.accountType);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !user || !accountType) return;
    let current = true;

    const redirectRestoredSession = async () => {
      if (isStrongAuthRequired(accountType) && !(await hasCurrentPrivilegedProof())) {
        if (current) router.replace("/auth/mfa");
        return;
      }
      if (!current) return;
      const destination =
        accountType === "admin"
          ? "/admin"
          : accountType === "student"
            ? "/dashboard/coach"
            : "/dashboard";
      router.replace(destination);
    };

    void redirectRestoredSession().catch(() => {
      if (current) router.replace("/auth/mfa");
    });
    return () => {
      current = false;
    };
  }, [accountType, isLoading, router, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await useAuthStore.getState().signIn(email, password);

      if (!result.success) {
        if (result.error === "account_inactive" || result.error === "account_suspended") {
          setError("Sua conta foi suspensa ou rejeitada. Entre em contato com o suporte.");
          return;
        }
        setError(userFacingAuthError(result.error));
        return;
      }

      // Wait for auth store to finish loading profile
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 5000); // max 5s fallback
        const unsub = useAuthStore.subscribe((state) => {
          if (!state.isLoading) {
            clearTimeout(timeout);
            unsub();
            resolve();
          }
        });
      });

      const { accountType, user: authUser } = useAuthStore.getState();

      if (!authUser) {
        setError("Perfil não encontrado. Crie uma nova conta ou contate o suporte.");
        return;
      }

      if (isStrongAuthRequired(accountType) && !(await hasCurrentPrivilegedProof())) {
        router.replace("/auth/mfa");
        return;
      }

      if (accountType === "admin") {
        router.push("/admin");
      } else if (accountType === "student") {
        router.push("/dashboard/coach");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPasskey();
      // O listener do provider carrega o perfil; o efeito acima decide o destino.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar com o aparelho.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || (user && accountType)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Restaurando sua sessão...</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen flex flex-col gap-4 items-center justify-center bg-background text-foreground">
        <p>Não foi possível carregar seu perfil.</p>
        <Button onClick={() => void useAuthStore.getState().initialize()}>Tentar novamente</Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 bg-background relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Glow Effects */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
      <div
        className="absolute bottom-1/4 -right-48 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      {/* Login Card */}
      <div className="relative max-w-md w-full mx-4">
        {/* Glassmorphism Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent tracking-tight">
              Eleva Pro
            </h1>
            <p className="text-muted-foreground text-sm">Dashboard de Profissionais</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all backdrop-blur-sm"
                  placeholder="seu@email.com"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Senha
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all backdrop-blur-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" size="lg" fullWidth isLoading={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {isPasskeyEnabled() ? (
            <Button
              type="button"
              size="lg"
              fullWidth
              disabled={loading}
              onClick={handlePasskeyLogin}
            >
              Entrar com Face ID ou PIN do aparelho
            </Button>
          ) : null}

          {/* Footer */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link
                href="/auth/role-selection"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Cadastre-se
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">Acesso exclusivo para profissionais</p>
          </div>
        </div>
      </div>
    </div>
  );
}
