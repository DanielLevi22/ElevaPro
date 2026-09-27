import { createNutritionService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

const nutrition = createNutritionService(supabase);
export type DietListStatus = 'all' | 'active' | 'draft' | 'finished';
const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');

/**
 * Lista do especialista, atualizada ao voltar do wizard e isolada por sessão.
 * @example const list = useDietPlanList(userId, canRead);
 */
export function useDietPlanList(userId: string | undefined, canRead: boolean) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DietListStatus>('all');
  const query = useQuery({
    queryKey: ['specialist-diet-plans', userId],
    queryFn: () => nutrition.fetchDietPlans(userId ?? ''),
    enabled: !!userId && canRead,
    gcTime: 0,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (userId && canRead) void refetch();
    }, [userId, canRead, refetch])
  );
  const plans = canRead ? query.data : undefined;
  const term = normalizeSearch(search);
  const visible = (plans ?? []).filter(
    (plan) =>
      (status === 'all' || plan.status === status) &&
      normalizeSearch(`${plan.name ?? ''} ${plan.student?.full_name ?? ''}`).includes(term)
  );
  return { ...query, plans, visible, search, setSearch, status, setStatus };
}
