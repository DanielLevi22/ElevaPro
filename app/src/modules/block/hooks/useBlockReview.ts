import {
  type BlockChoices,
  createBlockService,
  createMeasurementService,
  type DeclaredMeasurementInput,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import { approveNextBlock, requestNextBlock } from '../services/nextBlockService';
import { useReviewStore } from '../store/reviewStore';

const blocks = createBlockService(supabase);
const measurements = createMeasurementService(supabase);

/**
 * O que a pessoa respondeu sobre objetivo, dias, local e lesão (B2).
 *
 * @example const { data: hoje } = useBlockChoices(user.id);
 */
export function useBlockChoices(studentId: string | null) {
  return useQuery<BlockChoices>({
    queryKey: ['block-choices', studentId],
    enabled: Boolean(studentId),
    queryFn: () =>
      avisandoSeFalhar('block.read_choices', () => blocks.currentChoices(studentId as string)),
  });
}

/**
 * A última medida declarada, para o peso e a cintura virem preenchidos (B1).
 *
 * @example const { data: medidas } = useLatestDeclaredMeasure(user.id);
 */
export function useLatestDeclaredMeasure(studentId: string | null) {
  return useQuery({
    queryKey: ['latest-declared-measure', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const all = await avisandoSeFalhar('block.read_measure', () =>
        measurements.listMeasurements(studentId as string)
      );
      const own = all
        .filter((record) => record.measured_by === 'self')
        .sort((a, b) => b.assessed_at.localeCompare(a.assessed_at));
      return own[0] ?? null;
    },
  });
}

/**
 * Grava o peso e a cintura da reavaliação como medida declarada.
 *
 * @example await declare.mutateAsync({ weight_kg: 77.6, circ_waist: 82 });
 */
export function useDeclareMeasure(studentId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeclaredMeasurementInput) =>
      measurements.declareMeasurement(studentId as string, {
        ...input,
        assessed_at: new Date().toISOString(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['latest-declared-measure'] }),
  });
}

/**
 * Montar (B3) e aprovar (B5) o próximo bloco. Aprovar recarrega tudo o que lê
 * o plano: o bloco, os treinos e a dieta mudam de uma vez.
 *
 * @example const { build, approve } = useNextBlockActions();
 */
export function useNextBlockActions() {
  const queryClient = useQueryClient();
  const setPending = useReviewStore((state) => state.setPending);
  const build = useMutation({
    mutationFn: requestNextBlock,
    onSuccess: (pending) => setPending(pending),
  });
  const approve = useMutation({
    mutationFn: approveNextBlock,
    onSuccess: () => queryClient.invalidateQueries(),
  });
  return { build, approve };
}
