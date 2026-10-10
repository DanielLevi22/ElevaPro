import type { OnboardingAdjustment, OnboardingPlanPending } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { AntesDepois } from '@/components/ui/AntesDepois';
import { ChipPick } from '@/components/ui/ChipPick';
import { GlassSheet } from '@/components/ui/GlassSheet';

const DAYS = [2, 3, 4, 5, 6] as const;
const PROTEIN_STEP = 20;

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
 * O10 · Ajustar: os cinco ajustes do desenho. Cada um gera uma nova proposta, e
 * nada é gravado até "Aprovar plano" (ADR-0020).
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
          <AntesDepois
            primeira
            icon="repeat-outline"
            titulo="Trocar um alimento"
            antes={swap.from}
            depois={swap.to}
            selo="0 kcal"
            disabled={busy}
            onPress={() => onAdjust({ kind: 'swap_food' })}
          />
        ) : null}
        {target ? (
          <>
            <AntesDepois
              icon="cash-outline"
              titulo="Mais barato"
              antes="Plano atual"
              depois="Alimentos mais em conta"
              selo="estimativa"
              disabled={busy}
              onPress={() => onAdjust({ kind: 'cheaper' })}
            />
            <AntesDepois
              icon="flash-outline"
              titulo="Mais rápido"
              antes="Plano atual"
              depois="Preparo de até 15 min"
              selo="estimativa"
              disabled={busy}
              onPress={() => onAdjust({ kind: 'faster' })}
            />
            <AntesDepois
              icon="fish-outline"
              titulo="Mais proteína"
              antes={`${target.protein} g`}
              depois={`${target.protein + PROTEIN_STEP} g por dia`}
              selo="0 kcal"
              disabled={busy}
              onPress={() => onAdjust({ kind: 'more_protein' })}
            />
          </>
        ) : null}
        <View className="border-t border-glass-border py-[0.6875rem]">
          <Text className="text-[0.84375rem] font-bold text-foreground">Mudar dias de treino</Text>
          <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">
            A meta é recalculada com os dias novos.
          </Text>
          <View className="mt-2 flex-row gap-[0.4375rem]" accessibilityRole="radiogroup">
            {DAYS.map((days) => (
              <ChipPick
                key={days}
                rotulo={String(days)}
                marcado={plan.trainingDays === days}
                onPress={() => {
                  if (!busy && days !== plan.trainingDays)
                    onAdjust({ kind: 'training_days', days });
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </GlassSheet>
  );
}
