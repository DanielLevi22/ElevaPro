import type { ReactNode } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { FlowFrame, type FlowPrimaryAction } from '@/components/ui/FlowFrame';
import { StepBar } from '@/components/ui/StepBar';

/** As etapas que a barra conta: objetivo, nível, sobre você, treino, alimentação. */
const TOTAL_STEPS = 5;

interface OnboardingFrameProps {
  children: ReactNode;
  /** A etapa de 1 a 5. Sem ela, o cabeçalho some: a boas-vindas não conta como etapa. */
  step?: number;
  /** Sem ele, a tela não tem rodapé: a espera de O8 não tem o que tocar. */
  primary?: FlowPrimaryAction;
  /** O texto embaixo do botão: "Já tenho conta", "Prefiro não informar". */
  secondaryText?: { label: string; onPress: () => void };
  /** "Pular por enquanto" no cabeçalho: O6 e O7 seguem com o padrão (#365). */
  onSkip?: () => void;
  /** Um rodapé próprio no lugar do botão: a barra de duas ações de O9, a folha de O10. */
  overlay?: ReactNode;
}

/**
 * A moldura de toda tela do onboarding: a `FlowFrame` com as etapas no
 * cabeçalho e o "Pular por enquanto" de O6 e O7.
 *
 * @example
 * <OnboardingFrame step={1} primary={{ label: 'Continuar', onPress: seguir }}>…</OnboardingFrame>
 */
export function OnboardingFrame({ step, onSkip, ...frame }: OnboardingFrameProps) {
  const header = step
    ? {
        middle: <StepBar current={step} total={TOTAL_STEPS} />,
        right: onSkip ? (
          <TouchableOpacity onPress={onSkip} accessibilityRole="button" className="mt-4">
            <Text className="text-xs font-semibold text-hero-secondary">Pular por enquanto</Text>
          </TouchableOpacity>
        ) : undefined,
      }
    : undefined;
  return <FlowFrame header={header} {...frame} />;
}

// Os nomes do onboarding continuam: as telas importam daqui desde a #365.
export {
  FlowLabel as OnboardingLabel,
  FlowTitle as OnboardingTitle,
} from '@/components/ui/FlowFrame';
