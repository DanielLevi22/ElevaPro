const STEPS = [
  { n: 1 as const, label: "Periodização", desc: "Ciclo macro de treinos" },
  { n: 2 as const, label: "Fase", desc: "Bloco temático do ciclo" },
  { n: 3 as const, label: "Treino", desc: "Ficha A, B, C..." },
  { n: 4 as const, label: "Exercícios", desc: "Séries, reps e carga" },
];

interface Props {
  currentStep: 1 | 2 | 3 | 4;
}

export function WelcomeBanner({ currentStep }: Props) {
  return (
    <div className="bg-surface border border-overlay-10 rounded-2xl px-6 py-4">
      <div className="flex items-start gap-2 flex-wrap md:flex-nowrap">
        {STEPS.map((step, i) => {
          const done = step.n < currentStep;
          const active = step.n === currentStep;

          return (
            <div key={step.n} className="flex items-start gap-2 flex-1 min-w-0">
              {/* Step */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "bg-primary/20 border-2 border-primary text-primary"
                        : "bg-overlay-05 border border-overlay-10 text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs font-black">{step.n}</span>
                  )}
                </div>
                {/* Connector line below (mobile) */}
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-px h-4 mt-1 md:hidden ${done ? "bg-primary/40" : "bg-overlay-10"}`}
                  />
                )}
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0 pb-4 md:pb-0">
                <p
                  className={`text-xs font-semibold ${active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground"}`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 hidden md:block">
                  {step.desc}
                </p>
              </div>

              {/* Connector line (desktop) */}
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden md:block h-px w-8 mt-4 shrink-0 ${done ? "bg-primary/40" : "bg-overlay-10"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
