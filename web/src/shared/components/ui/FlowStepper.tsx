export interface FlowStep {
  n: number;
  label: string;
  desc: string;
}

interface FlowStepperProps {
  steps: readonly FlowStep[];
  currentStep: number;
}

function StepCheck() {
  return (
    <svg
      aria-hidden="true"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function stepCircleClass(done: boolean, active: boolean): string {
  if (done) return "bg-primary text-primary-foreground";
  if (active) return "bg-primary/20 border-2 border-primary text-primary";
  return "bg-overlay-05 border border-overlay-10 text-muted-foreground";
}

function stepLabelClass(done: boolean, active: boolean): string {
  if (active) return "text-foreground";
  if (done) return "text-foreground/70";
  return "text-muted-foreground";
}

/**
 * Passos de um fluxo guiado. No celular os passos empilham com o conector na
 * vertical: lado a lado, os quatro rótulos não cabiam e se sobrepunham.
 *
 * @example <FlowStepper steps={STEPS} currentStep={2} />
 */
export function FlowStepper({ steps, currentStep }: FlowStepperProps) {
  return (
    <div className="glass rounded-2xl px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-start md:gap-2">
        {steps.map((step, i) => {
          const done = step.n < currentStep;
          const active = step.n === currentStep;
          const hasNext = i < steps.length - 1;
          const connectorTone = done ? "bg-primary/40" : "bg-overlay-10";

          return (
            <div key={step.n} className="flex items-start gap-2 md:flex-1 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${stepCircleClass(done, active)}`}
                >
                  {done ? <StepCheck /> : <span className="text-xs font-black">{step.n}</span>}
                </div>
                {hasNext && <div className={`w-px h-4 mt-1 md:hidden ${connectorTone}`} />}
              </div>

              <div className="flex-1 min-w-0 pb-4 md:pb-0">
                <p className={`text-xs font-semibold ${stepLabelClass(done, active)}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 hidden md:block">
                  {step.desc}
                </p>
              </div>

              {hasNext && (
                <div className={`hidden md:block h-px w-8 mt-4 shrink-0 ${connectorTone}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
