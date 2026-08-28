"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";

type SpecialistRole = "personal_trainer" | "nutritionist";
type AnyRole = SpecialistRole | "student";

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<AnyRole[]>([]);

  const isStudent = selected.includes("student");

  const toggleSpecialist = (role: SpecialistRole) => {
    setSelected((prev) => {
      const withoutStudent = prev.filter((r) => r !== "student");
      return withoutStudent.includes(role)
        ? withoutStudent.filter((r) => r !== role)
        : [...withoutStudent, role];
    });
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    if (isStudent) {
      router.push("/auth/register?role=student");
    } else {
      router.push(`/auth/register?role=${selected.join(",")}`);
    }
  };

  const checkIcon = (
    <svg
      aria-hidden="true"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute top-1/4 -right-48 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
      <div
        className="absolute bottom-1/4 -left-48 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative max-w-4xl w-full mx-4">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Como você vai usar o Eleva Pro?
          </h1>
        </div>

        {/* Specialist cards */}
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Sou profissional de saúde <span className="text-white/30">— pode selecionar os dois</span>
        </p>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {(
            [
              {
                role: "personal_trainer" as SpecialistRole,
                label: "Personal Trainer",
                icon: "💪",
                description:
                  "Gerencie treinos, alunos e acompanhe a evolução física. Acesso completo às ferramentas de prescrição de exercícios.",
                color: "primary",
              },
              {
                role: "nutritionist" as SpecialistRole,
                label: "Nutricionista",
                icon: "🍎",
                description:
                  "Prescreva dietas, acompanhe refeições e evolução nutricional. Ferramentas especializadas para nutrição.",
                color: "secondary",
              },
            ] as const
          ).map(({ role, label, icon, description, color }) => {
            const sel = selected.includes(role);
            const disabled = isStudent;
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleSpecialist(role)}
                disabled={disabled}
                className={`group relative bg-white/5 backdrop-blur-xl border rounded-2xl p-8 text-left transition-all duration-300 hover:-translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                  sel
                    ? `border-${color} bg-${color}/10 shadow-[0_0_30px_-10px_rgba(var(--${color}),0.3)]`
                    : `border-white/10 hover:border-${color}/50 hover:bg-white/10`
                }`}
              >
                <div
                  className={`absolute inset-0 bg-linear-to-br from-${color}/20 to-transparent transition-opacity rounded-2xl ${
                    sel ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div
                      className={`w-16 h-16 rounded-xl bg-${color}/20 flex items-center justify-center text-3xl`}
                    >
                      {icon}
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        sel ? `border-${color} bg-${color} text-black` : "border-muted-foreground"
                      }`}
                    >
                      {sel && checkIcon}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">{label}</h2>
                    <p className="text-muted-foreground">{description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-muted-foreground text-sm">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Student card */}
        <button
          type="button"
          onClick={() => setSelected(["student"])}
          disabled={selected.length > 0 && !isStudent}
          className={`group relative w-full bg-white/5 backdrop-blur-xl border rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
            isStudent
              ? "border-accent bg-accent/10 shadow-[0_0_30px_-10px_rgba(var(--accent),0.3)]"
              : "border-white/10 hover:border-accent/50 hover:bg-white/10"
          }`}
        >
          <div
            className={`absolute inset-0 bg-linear-to-br from-accent/20 to-transparent transition-opacity rounded-2xl ${
              isStudent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          />
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center text-2xl shrink-0">
              ⚡
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">Sou Aluno</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                Acompanhe treinos, dieta e sua evolução física
              </p>
            </div>
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                isStudent ? "border-accent bg-accent text-black" : "border-muted-foreground"
              }`}
            >
              {isStudent && checkIcon}
            </div>
          </div>
        </button>

        <div className="flex flex-col items-center gap-6 mt-10">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={selected.length === 0}
            className="w-full max-w-md"
          >
            Continuar Cadastro
          </Button>

          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar para Login
          </button>
        </div>
      </div>
    </div>
  );
}
