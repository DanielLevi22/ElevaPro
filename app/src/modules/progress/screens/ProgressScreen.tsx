import { useState } from 'react';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { GlassSegmented } from '@/components/ui/GlassSegmented';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { NutritionSegment } from './NutritionSegment';
import { OverviewSegment } from './OverviewSegment';
import { TrainingSegment } from './TrainingSegment';

/**
 * A aba Progresso: o hub (tela 1), a nutrição em números (tela 7) e a evolução em
 * números (tela 2), trocados pelo segmento sem sair da aba, como o kit desenha.
 *
 * `initialSegment` é o que abre um segmento de fora da aba: o "Ver detalhes" do
 * relatório do período leva ao Treino (#312).
 *
 * @example <ProgressScreen studentId={user.id} initialSegment="training" />
 */
export const PROGRESS_SEGMENTS = ['overview', 'nutrition', 'training'] as const;
export type ProgressSegment = (typeof PROGRESS_SEGMENTS)[number];

interface ProgressScreenProps {
  studentId: string;
  initialSegment?: ProgressSegment;
}

const SEGMENTS = [
  { value: 'overview', label: 'Geral' },
  { value: 'nutrition', label: 'Nutrição' },
  { value: 'training', label: 'Treino' },
] as const;

export function ProgressScreen({ studentId, initialSegment = 'overview' }: ProgressScreenProps) {
  const [segment, setSegment] = useState<ProgressSegment>(initialSegment);
  const activity = useDailyActivity(studentId);
  const segments = <GlassSegmented options={SEGMENTS} value={segment} onChange={setSegment} />;

  return (
    <GlassScreen glow={PROGRESS_GLOW} refresh={{ refreshing: false, onRefresh: activity.reload }}>
      {segment === 'training' ? (
        <TrainingSegment studentId={studentId} segments={segments} />
      ) : null}
      {segment === 'nutrition' ? (
        <NutritionSegment studentId={studentId} segments={segments} />
      ) : null}
      {segment === 'overview' ? (
        <OverviewSegment
          activity={activity}
          segments={segments}
          onOpenTraining={() => setSegment('training')}
        />
      ) : null}
    </GlassScreen>
  );
}
