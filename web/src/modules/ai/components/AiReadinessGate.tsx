"use client";

import { Button } from "@/shared/components/ui/Button";
import type { AiReadinessScore } from "../services/aiReadiness";

interface Props {
  readiness: AiReadinessScore;
  onProceed: () => void;
  onCompleteProfile: () => void;
}

export function AiReadinessGate({ readiness, onProceed, onCompleteProfile }: Props) {
  const { score, level, missingRequired, missingOptional } = readiness;

  const scoreColor =
    level === "ready"
      ? "text-emerald-400"
      : level === "warning"
        ? "text-amber-400"
        : "text-rose-400";

  const barColor =
    level === "ready" ? "bg-emerald-500" : level === "warning" ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="mx-auto max-w-md space-y-5 p-5">
      {/* Score */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Perfil para o Assistente</h3>
          <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {level === "ready" && "Perfil completo. O assistente tem tudo que precisa."}
          {level === "warning" &&
            "Perfil razoável. O assistente pode precisar adivinhar alguns dados."}
          {level === "blocked" &&
            "Perfil incompleto. Complete os campos obrigatórios antes de prosseguir."}
        </p>
      </div>

      {/* Missing required */}
      {missingRequired.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-wide">
            Campos obrigatórios faltando
          </p>
          <ul className="space-y-1">
            {missingRequired.map((label) => (
              <li key={label} className="text-sm text-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing optional */}
      {missingOptional.length > 0 && level !== "blocked" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Campos opcionais (melhora a precisão)
          </p>
          <ul className="space-y-1">
            {missingOptional.map((label) => (
              <li key={label} className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {level !== "blocked" && (
          <Button size="lg" fullWidth onClick={onProceed}>
            {level === "ready" ? "Iniciar Assistente" : "Continuar assim mesmo"}
          </Button>
        )}
        <Button size="lg" fullWidth variant="secondary" onClick={onCompleteProfile}>
          {level === "blocked" ? "Completar perfil agora" : "Completar perfil primeiro"}
        </Button>
      </div>
    </div>
  );
}
