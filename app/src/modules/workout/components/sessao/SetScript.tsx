import {
  describeSegment,
  type SetPrescription,
  TRAINING_METHODS,
  type TrainingMethod,
  type TrainingMethodGroup,
  visibleMethodIds,
} from '@elevapro/shared';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';

const BY_ID = new Map(TRAINING_METHODS.map((m) => [m.id, m]));

/**
 * Tom do Badge por grupo de técnica — o mesmo agrupamento do web, que pinta com
 * classes próprias (`METHOD_GROUP_TONE`): o Badge do app só aceita estes tons.
 */
const GROUP_TONE: Record<TrainingMethodGroup, 'primary' | 'secondary' | 'warning' | 'neutral'> = {
  structure: 'primary',
  execution: 'secondary',
  pairing: 'neutral',
  scheme: 'warning',
  timed: 'neutral',
};

/**
 * O que a série da vez pede além de reps e carga (#431): as técnicas, o RIR
 * alvo e os blocos como roteiro. Tocar numa técnica abre a explicação e o
 * artigo que a sustenta.
 *
 * @example <SetScript prescription={next.prescription} />
 */
export function SetScript({ prescription }: { prescription: SetPrescription | null }) {
  const [open, setOpen] = useState<TrainingMethod | null>(null);
  if (!prescription) return null;

  const methods = visibleMethodIds(prescription.methods).flatMap((id) => BY_ID.get(id) ?? []);
  if (
    methods.length === 0 &&
    prescription.segments.length === 0 &&
    prescription.target_rir === null
  ) {
    return null;
  }

  return (
    <View className="mt-2.5 gap-2">
      {methods.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {methods.map((method) => (
            <Pressable
              key={method.id}
              onPress={() => setOpen(method)}
              accessibilityRole="button"
              accessibilityLabel={`${method.label}: ver como funciona`}
            >
              <Badge tone={GROUP_TONE[method.group]} dot={false}>
                {method.label}
              </Badge>
            </Pressable>
          ))}
        </View>
      ) : null}
      {prescription.target_rir !== null ? (
        <Text className="text-[0.75rem] text-muted-foreground">
          Pare com {prescription.target_rir}{' '}
          {prescription.target_rir === 1 ? 'repetição' : 'repetições'} antes da falha
        </Text>
      ) : null}
      {prescription.segments.map((segment, index) => (
        <Text
          // Bloco não tem id próprio: a posição é a ordem do roteiro.
          // biome-ignore lint/suspicious/noArrayIndexKey: ver comentário acima
          key={index}
          className="text-[0.75rem] text-foreground"
        >
          {describeSegment(segment)}
        </Text>
      ))}

      <BottomSheet
        visible={open !== null}
        onClose={() => setOpen(null)}
        title={open?.label ?? ''}
        closeLabel="Fechar a explicação"
      >
        <Text className="text-[0.875rem] leading-5 text-foreground">{open?.explanation}</Text>
        {open?.reference ? (
          <Pressable
            onPress={() => open.reference && Linking.openURL(open.reference.url)}
            accessibilityRole="link"
            className="mt-3"
          >
            <Text className="text-[0.8125rem] font-semibold text-primary-text">
              {open.reference.label} ↗
            </Text>
          </Pressable>
        ) : null}
      </BottomSheet>
    </View>
  );
}
