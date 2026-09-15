import { describeReadiness, type Readiness, type ReadinessBand } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { Orb } from '@/components/ui/Orb';
import { Vidro } from '@/components/ui/Vidro';
import { useCores } from '@/shared/design';

/**
 * "Prontidão de hoje" (ADR-0029): a nota, a faixa e a frase da comparação, com a
 * esfera ao lado.
 *
 * Sem nota, o cartão diz o que falta, e não mostra um número: a prontidão só existe
 * com 3 dias de sono e FC de repouso, e inventar um 70 para quem começou ontem é o
 * erro que a regra existe para não cometer.
 *
 * @example <ReadinessCard readiness={computeReadiness(today, baseline)} />
 */
const BAND_LABEL: Record<ReadinessBand, string> = {
  good: 'boa',
  moderate: 'moderada',
  low: 'baixa',
};

export function ReadinessCard({ readiness }: { readiness: Readiness | null }) {
  const cores = useCores();
  const bandColor: Record<ReadinessBand, string> = {
    good: cores.textoPassos,
    moderate: cores.textoGordura,
    low: cores.textoBatimento,
  };

  return (
    <Vidro
      classeExterna="mt-4"
      className="flex-row items-center gap-4 p-4"
      accessible
      accessibilityLabel={
        readiness
          ? `Prontidão de hoje: ${readiness.score}, ${BAND_LABEL[readiness.band]}. ${describeReadiness(readiness)}`
          : 'Prontidão de hoje ainda sem nota'
      }
    >
      <View className="flex-1">
        <Text className="text-[0.65625rem] font-extrabold uppercase tracking-widest text-placeholder">
          Prontidão de hoje
        </Text>
        {readiness ? (
          <>
            <View className="mt-[0.3125rem] flex-row items-baseline gap-1.5">
              <Text className="font-display-black text-[2.375rem] leading-[2.5rem] tracking-tighter text-foreground">
                {readiness.score}
              </Text>
              <Text
                className="text-[0.8125rem] font-bold"
                style={{ color: bandColor[readiness.band] }}
              >
                {BAND_LABEL[readiness.band]}
              </Text>
            </View>
            <Text className="mt-[0.3125rem] text-[0.75rem] leading-[1.05rem] text-muted-foreground">
              {describeReadiness(readiness)}
            </Text>
          </>
        ) : (
          <Text className="mt-2 text-[0.75rem] leading-[1.05rem] text-muted-foreground">
            A nota aparece com 3 dias de sono e FC de repouso, comparando você com você mesmo.
          </Text>
        )}
      </View>
      <View className="shrink-0">
        <Orb icon="pulse" scale={0.6} glyph={22} color={cores.metricaPassos} />
      </View>
    </Vidro>
  );
}
