import {
  bodyMassIndex,
  dataCurtaDoInstante,
  formatarDecimal,
  type PhysicalAssessment,
  weightDeltaKg,
} from '@elevapro/shared';
import { Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { ActionPill } from './ActionPill';

/**
 * Uma avaliação física na lista do especialista: data, quanto o peso mudou desde a
 * anterior, IMC, as medidas principais e as ações que a conta logada pode fazer.
 *
 * @example
 * <AssessmentCard assessment={a} number={1} previous={b} onCorrect={corrigir} />
 */
interface AssessmentCardProps {
  assessment: PhysicalAssessment;
  /** A posição na série, de 1 na mais recente. */
  number: number;
  previous: PhysicalAssessment | null;
  onCorrect?: () => void;
  onHistory?: () => void;
}

const MAIN_FIELDS = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg' },
  { key: 'height_cm', label: 'Altura', unit: 'cm' },
  { key: 'circ_waist', label: 'Cintura', unit: 'cm' },
  { key: 'circ_hip', label: 'Quadril', unit: 'cm' },
  { key: 'circ_chest', label: 'Peito', unit: 'cm' },
  { key: 'circ_right_arm', label: 'Braço D', unit: 'cm' },
] as const;

export function AssessmentCard({
  assessment,
  number,
  previous,
  onCorrect,
  onHistory,
}: AssessmentCardProps) {
  const bmi = bodyMassIndex(assessment);
  return (
    <Vidro classeExterna="mb-2.5" className="p-3.5">
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-legenda font-bold text-primary-text">{number}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-rotulo font-semibold text-foreground">
            {dateLabel(assessment.created_at)}
          </Text>
          <WeightDelta delta={weightDeltaKg(assessment, previous)} />
        </View>
        {bmi !== null ? <Chip tom="neutro">{`IMC ${formatarDecimal(bmi)}`}</Chip> : null}
      </View>
      <View className="mt-3 flex-row flex-wrap border-t-[0.5px] border-glass-border pt-3">
        {MAIN_FIELDS.map(({ key, label, unit }) => (
          <StatCell key={key} label={label} value={assessment[key]} unit={unit} />
        ))}
      </View>
      {assessment.notes ? (
        <Text className="mt-1 border-t-[0.5px] border-glass-border pt-3 text-legenda text-muted-foreground">
          {assessment.notes}
        </Text>
      ) : null}
      <CardActions onCorrect={onCorrect} onHistory={onHistory} />
    </Vidro>
  );
}

/** "06 mai 2026": a avaliação é registro de longo prazo, e o ano importa. */
function dateLabel(createdAt: string): string {
  return `${dataCurtaDoInstante(createdAt)} ${new Date(createdAt).getFullYear()}`;
}

function WeightDelta({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const sign = delta > 0 ? '+' : '';
  return (
    <Text
      className={cn(
        'mt-0.5 text-legenda',
        delta < 0 && 'text-texto-saude-passos',
        delta > 0 && 'text-texto-macro-gordura',
        delta === 0 && 'text-muted-foreground'
      )}
    >
      {`${sign}${formatarDecimal(delta)} kg desde a anterior`}
    </Text>
  );
}

function StatCell({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <View className="mb-3 w-1/3">
      <Text className="text-legenda text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 text-rotulo font-semibold text-foreground">
        {value === null ? '—' : `${formatarDecimal(value)} ${unit}`}
      </Text>
    </View>
  );
}

function CardActions({
  onCorrect,
  onHistory,
}: Pick<AssessmentCardProps, 'onCorrect' | 'onHistory'>) {
  if (!onCorrect && !onHistory) return null;
  return (
    <View className="mt-3 flex-row flex-wrap gap-[0.5625rem]">
      {onCorrect ? <ActionPill icon="create-outline" label="Corrigir" onPress={onCorrect} /> : null}
      {onHistory ? <ActionPill icon="time-outline" label="Correções" onPress={onHistory} /> : null}
    </View>
  );
}
