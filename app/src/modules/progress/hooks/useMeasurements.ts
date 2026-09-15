import {
  createMeasurementService,
  type DeclaredMeasurementInput,
  latestSource,
  type MeasurementSource,
  type PhysicalAssessment,
  seriesOf,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { avisandoSeFalhar } from '@/lib/registro';

const measurements = createMeasurementService(supabase);

export interface MeasurementsState {
  /** As avaliações da origem escolhida, da mais antiga à mais recente. */
  series: PhysicalAssessment[];
  source: MeasurementSource | null;
  /** As origens que o aluno tem; com as duas, a tela oferece a troca. */
  sources: MeasurementSource[];
  setSource: (source: MeasurementSource) => void;
  all: PhysicalAssessment[];
  loading: boolean;
}

/**
 * As medidas do aluno para as telas de corpo (#312), já recortadas por origem.
 *
 * Abre na origem do registro mais recente, e a troca fica na tela: fita e declaração
 * nunca entram na mesma série.
 *
 * @example const { series, source, setSource } = useMeasurements(user.id);
 */
export function useMeasurements(studentId: string): MeasurementsState {
  const { data, isLoading } = useQuery({
    queryKey: ['measurements', studentId],
    queryFn: () =>
      avisandoSeFalhar('progress.read_measurements', () =>
        measurements.listMeasurements(studentId)
      ),
  });
  const all = data ?? [];
  const [chosen, setSource] = useState<MeasurementSource | null>(null);
  const source = chosen ?? latestSource(all);
  const sources = useMemo(
    () =>
      (['specialist', 'self'] as const).filter((item) =>
        all.some((record) => record.measured_by === item)
      ),
    [all]
  );
  const series = useMemo(() => (source ? seriesOf(all, source) : []), [all, source]);
  return { series, source, sources, setSource, all, loading: isLoading };
}

/**
 * Declarar, corrigir e apagar a medida do próprio aluno, atualizando as telas.
 *
 * O log de falha vai sem o erro: o do PostgREST pode carregar a linha com as medidas
 * (Art. 6°, VII).
 *
 * @example const { declare } = useMeasurementMutations(user.id); declare.mutate(input);
 */
export function useMeasurementMutations(studentId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['measurements', studentId] });
  const declare = useMutation({
    mutationFn: (input: DeclaredMeasurementInput) =>
      avisandoSeFalhar('progress.declare_measurement', () =>
        measurements.declareMeasurement(studentId, input)
      ),
    onSuccess: refresh,
  });
  const correct = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeclaredMeasurementInput }) =>
      avisandoSeFalhar('progress.correct_measurement', () =>
        measurements.correctMeasurement(id, input)
      ),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      avisandoSeFalhar('progress.delete_measurement', () => measurements.deleteMeasurement(id)),
    onSuccess: refresh,
  });
  return { declare, correct, remove };
}
