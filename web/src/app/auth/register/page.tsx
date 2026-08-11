"use client";

import type { ServiceType } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useAuthStore } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";

type AccountRole = "specialist" | "student";

const SERVICE_OPTIONS: { value: ServiceType; label: string; description: string }[] = [
  {
    value: "personal_training",
    label: "Personal Training",
    description: "Treinos, periodizações e acompanhamento físico",
  },
  {
    value: "nutrition_consulting",
    label: "Nutrição",
    description: "Planos alimentares e acompanhamento nutricional",
  },
];

function deriveInitialState(roleParam: string | null): {
  role: AccountRole;
  services: ServiceType[];
} {
  if (!roleParam) return { role: "specialist", services: [] };
  if (roleParam === "student") return { role: "student", services: [] };
  const services: ServiceType[] = [];
  if (roleParam.includes("personal_trainer")) services.push("personal_training");
  if (roleParam.includes("nutritionist")) services.push("nutrition_consulting");
  return { role: "specialist", services };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const fromRoleSelection = roleParam !== null;

  const initial = deriveInitialState(roleParam);
  const [role, setRole] = useState<AccountRole>(initial.role);
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(initial.services);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleService = (service: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  };

  const roleSummary = useMemo(() => {
    if (role === "student") return { icon: "⚡", label: "Aluno", color: "accent" };
    const parts: string[] = [];
    if (selectedServices.includes("personal_training")) parts.push("💪 Personal Trainer");
    if (selectedServices.includes("nutrition_consulting")) parts.push("🍎 Nutricionista");
    return { icon: null, label: parts.join(" + ") || "Especialista", color: "primary" };
  }, [role, selectedServices]);

  const validate = (): string | null => {
    if (!fullName.trim() || fullName.trim().length < 2) return "Digite seu nome completo";
    if (!email.trim()) return "Digite seu e-mail";
    if (role === "specialist" && selectedServices.length === 0)
      return "Selecione pelo menos um serviço";
    if (password.length < 8) return "A senha deve ter no mínimo 8 caracteres";
    if (password !== confirmPassword) return "As senhas não coincidem";
    return null;
  };

  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const endpoint = role === "student" ? "/api/auth/register/student" : "/api/auth/register";

      const body =
        role === "student"
          ? { email: email.trim().toLowerCase(), password, full_name: fullName.trim() }
          : {
              email: email.trim().toLowerCase(),
              password,
              full_name: fullName.trim(),
              service_types: selectedServices,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar conta");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 5000);
        const unsub = useAuthStore.subscribe((state) => {
          if (!state.isLoading) {
            clearTimeout(timeout);
            unsub();
            resolve();
          }
        });
      });

      router.push(role === "student" ? "/dashboard/coach" : "/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute top-1/4 -right-48 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -left-48 w-96 h-96 bg-secondary/20 rounded-full blur-[128px]" />

      <div className="relative max-w-md w-full mx-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Criar Conta
            </h1>
            <p className="text-muted-foreground text-sm">Eleva Pro</p>
          </div>

          {/* Selected role badge — shown when coming from role-selection */}
          {fromRoleSelection && (
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                roleSummary.color === "accent"
                  ? "bg-accent/10 border-accent/30"
                  : "bg-primary/10 border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{roleSummary.label}</span>
              </div>
              <Link
                href="/auth/role-selection"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Alterar
              </Link>
            </div>
          )}

          {/* Role selector — only shown when arriving directly, not from role-selection */}
          {!fromRoleSelection && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("specialist")}
                className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                  role === "specialist"
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <span className="text-sm font-semibold text-foreground">Sou Especialista</span>
                <span className="text-xs text-muted-foreground">Personal / Nutricionista</span>
                {role === "specialist" && (
                  <div className="mt-1 pt-3 border-t border-white/10 flex flex-col gap-2 w-full">
                    {SERVICE_OPTIONS.map((option) => {
                      const selected = selectedServices.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleService(option.value);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                            selected
                              ? "border-primary/60 bg-primary/15 text-foreground"
                              : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                              selected ? "border-primary bg-primary" : "border-white/30"
                            }`}
                          >
                            {selected && (
                              <svg
                                className="w-2 h-2 text-primary-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-xs font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 text-center transition-all ${
                  role === "student"
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <span className="text-sm font-semibold text-foreground">Sou Aluno</span>
                <span className="text-xs text-muted-foreground">Acompanhe seu progresso</span>
              </button>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleRegister}>
            {error && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {[
                {
                  id: "fullName",
                  label: "Nome Completo",
                  type: "text",
                  value: fullName,
                  onChange: setFullName,
                  placeholder: "Seu nome",
                },
                {
                  id: "email",
                  label: "E-mail",
                  type: "email",
                  value: email,
                  onChange: setEmail,
                  placeholder: "seu@email.com",
                },
                {
                  id: "password",
                  label: "Senha",
                  type: "password",
                  value: password,
                  onChange: setPassword,
                  placeholder: "Mínimo 8 caracteres",
                },
                {
                  id: "confirmPassword",
                  label: "Confirmar Senha",
                  type: "password",
                  value: confirmPassword,
                  onChange: setConfirmPassword,
                  placeholder: "Digite a senha novamente",
                },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <label htmlFor={field.id} className="block text-sm font-medium text-foreground">
                    {field.label} <span className="text-destructive">*</span>
                  </label>
                  <input
                    id={field.id}
                    type={field.type}
                    required
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder={field.placeholder}
                    minLength={field.type === "password" ? 8 : undefined}
                  />
                </div>
              ))}
            </div>

            <Button type="submit" size="lg" fullWidth isLoading={loading}>
              {loading ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              href="/auth/login"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Fazer Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * `useSearchParams` força bailout de CSR no prerender estático, então o build
 * de produção falha sem um limite de Suspense — erro que só aparece em
 * `next build`, nunca em `next dev`.
 *
 * O fallback repete a moldura visual da página para não haver salto de layout
 * enquanto os search params resolvem.
 */
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted-foreground text-sm">Carregando…</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
