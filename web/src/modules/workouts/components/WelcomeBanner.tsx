import { FlowStepper } from "@/shared/components/ui/FlowStepper";

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
  return <FlowStepper steps={STEPS} currentStep={currentStep} />;
}
