import type { DietPlan } from '@elevapro/shared';
import { Text, TouchableOpacity, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';

const STATUS = { active: 'Ativa', draft: 'Rascunho', finished: 'Finalizada' } as const;
const STATUS_TONE = { active: 'evolucao', draft: 'aviso', finished: 'neutro' } as const;
interface DietPlanListCardProps {
  plan: DietPlan & { student?: { full_name: string | null } };
  onPress: () => void;
}

/** Resumo do plano sem expor notas ou restrições na listagem geral. */
export function DietPlanListCard({ plan, onPress }: DietPlanListCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${plan.name || 'Plano alimentar'}, ${plan.student?.full_name || 'Aluno'}, ${STATUS[plan.status]}`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Vidro classeExterna="mb-[0.5625rem]" className="gap-3 p-[0.8125rem]">
        <View className="flex-row items-start gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-[0.90625rem] font-bold text-foreground">
              {plan.name || 'Plano alimentar'}
            </Text>
            <Text className="text-[0.71875rem] text-muted-foreground">
              {plan.student?.full_name || 'Aluno'}
            </Text>
          </View>
          <Chip tom={STATUS_TONE[plan.status]}>{STATUS[plan.status]}</Chip>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <Chip icone="flame-outline">{`${plan.target_calories ?? '—'} kcal`}</Chip>
          <Chip>{`Versão ${plan.version}`}</Chip>
          <Text className="text-[0.71875rem] font-semibold text-primary-text">
            {plan.status === 'draft' ? 'Continuar montagem →' : 'Ver plano →'}
          </Text>
        </View>
      </Vidro>
    </TouchableOpacity>
  );
}
