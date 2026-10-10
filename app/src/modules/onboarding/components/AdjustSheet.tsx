import type { OnboardingAdjustment, OnboardingPlanPending } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { BeforeAfterRow } from '@/components/ui/BeforeAfterRow';
import { GlassSheet } from '@/components/ui/GlassSheet';

const DAYS = [2, 3, 4, 5, 6] as const;
const PROTEIN_STEP = 20;

const kcal = (value: number) => `${value.toLocaleString('pt-BR')} kcal`;
/** "+80 kcal", "−120 kcal", "0 kcal": o sinal diz para onde a meta vai. */
const delta = (value: number) =>
  value === 0 ? '0 kcal' : `${value > 0 ? '+' : '−'}${kcal(Math.abs(value))}`;

interface AdjustSheetProps {
  visible: boolean;
  plan: OnboardingPlanPending;
  /** Um ajuste em andamento: a IA leva uns segundos para remontar. */
  busy: boolean;
  canUndo: boolean;
  onAdjust: (adjustment: OnboardingAdjustment) => void;
  onClose: () => void;
}

/**
 * O10 · Ajustar: os cinco ajustes do desenho, cada um com antes → depois e o Δ
 * kcal. Cada um gera uma nova proposta, e nada é gravado até "Aprovar plano"
 * (ADR-0020).
 *
 * "Mais barato" e "Mais rápido" dizem que são estimativa: o banco não tem preço
 * nem tempo de preparo, e quem escolhe é a IA.
 *
 * @example <AdjustSheet visible plan={plano} busy={false} canUndo onAdjust={ajustar} onClose={fechar} />
 */
export function AdjustSheet({ visible, plan, busy, canUndo, onAdjust, onClose }: AdjustSheetProps) {
  const target = plan.target;
  const swap = plan.suggestedSwap;

  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      busy={busy}
      primary={{ label: busy ? 'Ajustando…' : 'Pronto', onPress: onClose }}
      secondary={
        canUndo
          ? { label: 'Desfazer último ajuste', onPress: () => onAdjust({ kind: 'undo' }) }
          : { label: 'Cancelar', onPress: onClose }
      }
    >
      <Text className="font-display-black text-[1.375rem] tracking-tight text-foreground">
        Ajustar plano
      </Text>
      <Text className="mt-1 text-[0.78125rem] text-muted-foreground">
        Toque para aplicar. Dá para desfazer.
      </Text>
      <View className="mt-2.5">
        {swap ? (
          <BeforeAfterRow
            first
            icon="repeat-outline"
            title="Trocar um alimento"
            before={swap.from}
            after={swap.to}
            badge="0 kcal"
            disabled={busy}
            onPress={() => onAdjust({ kind: 'swap_food' })}
          />
        ) : null}
        {target ? (
          <>
            <BeforeAfterRow
              icon="cash-outline"
              title="Mais barato"
              before="Plano atual"
              after="Alimentos mais em conta"
              badge="0 kcal · estimativa"
              disabled={busy}
              onPress={() => onAdjust({ kind: 'cheaper' })}
            />
            <BeforeAfterRow
              icon="flash-outline"
              title="Mais rápido"
              before="Plano atual"
              after="Preparo de até 15 min"
              badge="0 kcal · estimativa"
              disabled={busy}
              onPress={() => onAdjust({ kind: 'faster' })}
            />
            <BeforeAfterRow
              icon="fish-outline"
              title="Mais proteína"
              before={`${target.protein} g`}
              after={`${target.protein + PROTEIN_STEP} g por dia`}
              badge="0 kcal"
              disabled={busy}
              onPress={() => onAdjust({ kind: 'more_protein' })}
            />
          </>
        ) : null}
        <TrainingDaysOptions plan={plan} busy={busy} onAdjust={onAdjust} />
      </View>
    </GlassSheet>
  );
}

interface TrainingDaysOptionsProps {
  plan: OnboardingPlanPending;
  busy: boolean;
  onAdjust: (adjustment: OnboardingAdjustment) => void;
}

/**
 * Cada opção de dias como antes → depois, com a meta que o servidor já calculou
 * para ela. Sem dieta, a meta não muda: mostra só os dias.
 */
function TrainingDaysOptions({ plan, busy, onAdjust }: TrainingDaysOptionsProps) {
  const byDays = plan.caloriesByTrainingDays;
  const current = plan.target?.calories ?? null;
  const label = (days: number, calories: number | undefined) =>
    calories === undefined ? `${days} dias` : `${days} dias · ${kcal(calories)}`;

  return (
    <>
      {DAYS.filter((days) => days !== plan.trainingDays).map((days) => {
        const next = byDays?.[String(days)];
        return (
          <BeforeAfterRow
            key={days}
            icon="calendar-outline"
            title={`Treinar ${days} dias por semana`}
            before={label(plan.trainingDays, current ?? undefined)}
            after={label(days, next)}
            badge={next !== undefined && current !== null ? delta(next - current) : 'sem dieta'}
            disabled={busy}
            onPress={() => onAdjust({ kind: 'training_days', days })}
          />
        );
      })}
    </>
  );
}
