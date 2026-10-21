import {
  describeSegment,
  type SetPrescription,
  TRAINING_METHODS,
  type TrainingMethod,
  type TrainingMethodGroup,
} from '@elevapro/shared';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';

const POR_ID = new Map(TRAINING_METHODS.map((m) => [m.id, m]));

/** Tom do Badge por grupo de técnica — o mesmo agrupamento do web. */
const TOM_DO_GRUPO: Record<TrainingMethodGroup, 'primary' | 'secondary' | 'warning' | 'neutral'> = {
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
 * @example <RoteiroDaSerie prescricao={proxima.prescricao} />
 */
export function RoteiroDaSerie({ prescricao }: { prescricao: SetPrescription | null }) {
  const [aberta, setAberta] = useState<TrainingMethod | null>(null);
  if (!prescricao) return null;

  const tecnicas = prescricao.methods
    .filter((id) => id !== 'working')
    .flatMap((id) => POR_ID.get(id) ?? []);
  if (tecnicas.length === 0 && prescricao.segments.length === 0 && prescricao.target_rir === null) {
    return null;
  }

  return (
    <View className="mt-2.5 gap-2">
      {tecnicas.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {tecnicas.map((tecnica) => (
            <Pressable
              key={tecnica.id}
              onPress={() => setAberta(tecnica)}
              accessibilityRole="button"
              accessibilityLabel={`${tecnica.label}: ver como funciona`}
            >
              <Badge tone={TOM_DO_GRUPO[tecnica.group]} dot={false}>
                {tecnica.label}
              </Badge>
            </Pressable>
          ))}
        </View>
      ) : null}
      {prescricao.target_rir !== null ? (
        <Text className="text-[0.75rem] text-muted-foreground">
          Pare com {prescricao.target_rir}{' '}
          {prescricao.target_rir === 1 ? 'repetição' : 'repetições'} antes da falha
        </Text>
      ) : null}
      {prescricao.segments.map((bloco, indice) => (
        <Text
          // Bloco não tem id próprio: a posição é a ordem do roteiro.
          // biome-ignore lint/suspicious/noArrayIndexKey: ver comentário acima
          key={indice}
          className="text-[0.75rem] text-foreground"
        >
          {describeSegment(bloco)}
        </Text>
      ))}

      <BottomSheet
        visible={aberta !== null}
        onClose={() => setAberta(null)}
        title={aberta?.label ?? ''}
        closeLabel="Fechar a explicação"
      >
        <Text className="text-[0.875rem] leading-5 text-foreground">{aberta?.explanation}</Text>
        {aberta?.reference ? (
          <Pressable
            onPress={() => aberta.reference && Linking.openURL(aberta.reference.url)}
            accessibilityRole="link"
            className="mt-3"
          >
            <Text className="text-[0.8125rem] font-semibold text-primary-text">
              {aberta.reference.label} ↗
            </Text>
          </Pressable>
        ) : null}
      </BottomSheet>
    </View>
  );
}
