import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { StepBar } from '@/components/ui/StepBar';
import { useBottomOffset } from '@/shared/design';

/** As etapas que a barra conta: objetivo, nível, sobre você, treino, alimentação. */
const TOTAL_STEPS = 5;

/** Do fundo do telefone no kit: o botão principal a 40, ou a 84 com o texto embaixo. */
const PRIMARY_ALONE = 40;
const PRIMARY_OVER_TEXT = 84;
const SECONDARY_TEXT = 40;

interface OnboardingFrameProps {
  children: ReactNode;
  /** A etapa de 1 a 5. Sem ela, o cabeçalho some: a boas-vindas não conta como etapa. */
  step?: number;
  /** Sem ele, a tela não tem rodapé: a espera de O8 não tem o que tocar. */
  primary?: {
    label: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    disabled?: boolean;
    /** Por que está desabilitado. Botão travado sem motivo é beco. */
    hint?: string;
  };
  /** O texto embaixo do botão: "Já tenho conta", "Prefiro não informar". */
  secondaryText?: { label: string; onPress: () => void };
  /** "Pular por enquanto" no cabeçalho: O6 e O7 seguem com o padrão (#365). */
  onSkip?: () => void;
  /** Um rodapé próprio no lugar do botão: a barra de duas ações de O9, a folha de O10. */
  overlay?: ReactNode;
}

/**
 * A moldura de toda tela do onboarding no kit (`OnbHeader` e o rodapé de
 * `BotaoDeDestaque`): voltar e etapas no topo, a ação principal fixa embaixo.
 *
 * @example
 * <OnboardingFrame step={1} primary={{ label: 'Continuar', onPress: seguir }}>…</OnboardingFrame>
 */
export function OnboardingFrame({
  children,
  step,
  primary,
  secondaryText,
  onSkip,
  overlay,
}: OnboardingFrameProps) {
  const router = useRouter();

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        overlay ?? (primary ? <Footer primary={primary} secondaryText={secondaryText} /> : null)
      }
    >
      {step ? (
        <View className="min-h-[3.25rem] flex-row items-center gap-3">
          <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
          <View className="flex-1">
            <StepBar current={step} total={TOTAL_STEPS} />
          </View>
          {onSkip ? (
            <TouchableOpacity onPress={onSkip} accessibilityRole="button" className="mt-4">
              <Text className="text-xs font-semibold text-hero-secondary">Pular por enquanto</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {children}
    </GlassScreen>
  );
}

function Footer({
  primary,
  secondaryText,
}: Required<Pick<OnboardingFrameProps, 'primary'>> & Pick<OnboardingFrameProps, 'secondaryText'>) {
  const primaryBottom = useBottomOffset(secondaryText ? PRIMARY_OVER_TEXT : PRIMARY_ALONE);
  const secondaryBottom = useBottomOffset(SECONDARY_TEXT);

  return (
    <>
      <View className="absolute left-[1.125rem] right-[1.125rem]" style={{ bottom: primaryBottom }}>
        {primary.disabled && primary.hint ? (
          <Text className="mb-[0.5625rem] text-center text-[0.71875rem] text-hero-secondary">
            {primary.hint}
          </Text>
        ) : null}
        <BotaoDeDestaque
          rotulo={primary.label}
          icone={primary.disabled ? 'lock-closed' : (primary.icon ?? 'arrow-forward')}
          onPress={primary.onPress}
          disabled={primary.disabled}
        />
      </View>
      {secondaryText ? (
        <TouchableOpacity
          onPress={secondaryText.onPress}
          accessibilityRole="button"
          className="absolute left-[1.125rem] right-[1.125rem] h-9 items-center justify-center"
          style={{ bottom: secondaryBottom }}
        >
          <Text className="text-[0.84375rem] font-semibold text-hero-secondary">
            {secondaryText.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

/**
 * O título das telas do onboarding (`Title` do kit): sobrelinha opcional, o
 * título em display e a explicação embaixo.
 *
 * @example <OnboardingTitle sub="Escolha o principal.">Qual é o seu objetivo?</OnboardingTitle>
 */
export function OnboardingTitle({
  children,
  sub,
  eyebrow,
  large = false,
}: {
  children: string;
  sub?: string;
  eyebrow?: string;
  /** 36 no kit, só na boas-vindas; o resto usa 28. */
  large?: boolean;
}) {
  return (
    <View className="mt-[1.375rem]">
      {eyebrow ? (
        <Text className="mb-2 font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
          {eyebrow}
        </Text>
      ) : null}
      <Text
        accessibilityRole="header"
        className={
          large
            ? 'font-display-black text-[2.25rem] leading-[2.43rem] tracking-tight text-hero'
            : 'font-display-black text-[1.75rem] leading-[1.89rem] tracking-tight text-hero'
        }
      >
        {children}
      </Text>
      {sub ? (
        <Text className="mt-2 text-[0.84375rem] leading-[1.18rem] text-hero-secondary">{sub}</Text>
      ) : null}
    </View>
  );
}

/**
 * O rótulo de seção do kit (`Label`): mono em caixa alta, com a nota à direita
 * ("opcional", "marque quantos quiser").
 *
 * @example <OnboardingLabel right="opcional">Pratica algum esporte?</OnboardingLabel>
 */
export function OnboardingLabel({ children, right }: { children: string; right?: string }) {
  return (
    <View className="mx-0.5 mb-[0.5625rem] mt-5 flex-row items-baseline justify-between">
      <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
        {children}
      </Text>
      {right ? <Text className="text-[0.71875rem] text-placeholder">{right}</Text> : null}
    </View>
  );
}
