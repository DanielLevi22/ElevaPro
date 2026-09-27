import { createNutritionService, type DietPlan } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ToggleChip } from './ToggleChip';

const nutrition = createNutritionService(supabase);
type CopySource = DietPlan & { student?: { id: string; full_name: string | null } };
const STATUS_LABEL = { draft: 'Rascunho', active: 'Ativo', finished: 'Finalizado' };

interface DietCopySourceProps {
  userId: string;
  ownPlan: boolean;
  selectedPlanId: string | null;
  onSelect: (planId: string | null) => void;
}

/**
 * Escolhe a origem da cópia sem levar dados do outro aluno para o rascunho.
 * @example <DietCopySource userId={userId} ownPlan selectedPlanId={source} onSelect={setSource} />
 */
export function DietCopySource({ userId, ownPlan, selectedPlanId, onSelect }: DietCopySourceProps) {
  const [sourceStudentId, setSourceStudentId] = useState<string | null>(null);
  const query = useQuery<CopySource[]>({
    queryKey: ['diet-copy-sources', userId, ownPlan],
    queryFn: () =>
      ownPlan ? nutrition.fetchStudentDietPlans(userId) : nutrition.fetchDietPlans(userId),
  });
  const plans = query.data;
  const students = [
    ...new Map(
      (plans ?? []).map((plan) => [plan.student_id, plan.student?.full_name ?? 'Aluno'])
    ).entries(),
  ];
  const visible = plans?.filter((plan) => ownPlan || plan.student_id === sourceStudentId) ?? [];

  if (plans === undefined) {
    return (
      <View className="gap-2 py-4">
        <Text accessibilityRole="alert" className="text-sm text-muted-foreground">
          {query.error
            ? 'Não foi possível carregar os planos.'
            : query.fetchStatus === 'paused'
              ? 'Sem conexão. Conecte-se para escolher um plano.'
              : 'Carregando planos…'}
        </Text>
        {query.error && (
          <ToggleChip active={false} onPress={() => void query.refetch()}>
            Tentar novamente
          </ToggleChip>
        )}
      </View>
    );
  }

  return (
    <View>
      <TituloDeSecao estilo="rotulo">
        {ownPlan ? 'Seu plano de origem' : 'Aluno de origem'}
      </TituloDeSecao>
      {plans.length === 0 && (
        <Text className="text-sm text-muted-foreground">
          Nenhum plano disponível para copiar. Você pode começar do zero.
        </Text>
      )}
      {!ownPlan &&
        students.map(([id, name]) => (
          <GlassChoice
            key={id}
            icon="person-outline"
            title={name}
            sub="Escolher um plano deste aluno"
            active={id === sourceStudentId}
            onPress={() => {
              setSourceStudentId(id);
              onSelect(null);
            }}
          />
        ))}
      {!ownPlan && sourceStudentId && (
        <TituloDeSecao estilo="rotulo">Plano de origem</TituloDeSecao>
      )}
      {visible.map((plan) => (
        <GlassChoice
          key={plan.id}
          icon="document-text-outline"
          title={plan.name ?? 'Plano alimentar'}
          sub={`${STATUS_LABEL[plan.status]} · v${plan.version} · ${plan.target_calories ?? '—'} kcal`}
          active={plan.id === selectedPlanId}
          onPress={() => onSelect(plan.id)}
        />
      ))}
      <Text className="my-3 text-xs text-muted-foreground">
        Só a estrutura, as metas e os alimentos serão copiados. Revise as preferências do novo plano
        antes de enviar.
      </Text>
    </View>
  );
}
