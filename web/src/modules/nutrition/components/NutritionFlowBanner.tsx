import { FlowStepper } from "@/shared/components/ui/FlowStepper";

const STEPS = [
  { n: 1 as const, label: "Estratégia", desc: "Macros e tipo de ciclo" },
  { n: 2 as const, label: "Refeições", desc: "Estruture o dia alimentar" },
  { n: 3 as const, label: "Alimentos", desc: "Popule cada refeição" },
  { n: 4 as const, label: "Envio", desc: "O plano passa a valer" },
];

interface Props {
  currentStep: 1 | 2 | 3 | 4;
}

export function NutritionFlowBanner({ currentStep }: Props) {
  return <FlowStepper steps={STEPS} currentStep={currentStep} />;
}
