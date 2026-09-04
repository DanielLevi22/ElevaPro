"use client";

import { Button } from "@/shared/components/ui/Button";

interface Props {
  profileSummary: Record<string, string | null>;
  coachMode: "express" | "analytical";
  onConfirm: () => void;
  onChangeMode: (mode: "express" | "analytical") => void;
}

const FIELD_LABELS: Record<string, string> = {
  objetivo: "Objetivo",
  peso_altura: "Peso / Altura",
  experiencia: "Experiência",
  frequencia: "Frequência",
  local: "Local de treino",
  dieta: "Dieta",
  lesoes: "Lesões",
};

export function ProfileConfirmationCard({
  profileSummary,
  coachMode,
  onConfirm,
  onChangeMode,
}: Props) {
  const entries = Object.entries(FIELD_LABELS)
    .map(([key, label]) => ({ label, value: profileSummary[key] ?? null }))
    .filter((e) => e.value !== null);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="bg-surface border border-primary/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Seu perfil carregado</h4>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
            Revisar antes de gerar
          </span>
        </div>

        {/* Profile fields */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {entries.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Mode selector */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Modo do assistente
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["express", "analytical"] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => onChangeMode(mode)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  coachMode === mode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                }`}
              >
                {mode === "express" ? "⚡ Expresso" : "🔬 Analítico"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {coachMode === "express"
              ? "Gera o plano direto, sem perguntas."
              : "Conversa antes de propor, explica cada escolha."}
          </p>
        </div>

        <Button size="lg" fullWidth onClick={onConfirm}>
          Confirmar e iniciar
        </Button>
      </div>
    </div>
  );
}
