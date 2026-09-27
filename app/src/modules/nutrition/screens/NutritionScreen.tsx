import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { GlassSearchField } from '@/components/ui/GlassSearchField';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { DietListFeedback } from '../components/diet/DietListFeedback';
import { DietPlanListCard } from '../components/diet/DietPlanListCard';
import { ToggleChip } from '../components/diet/ToggleChip';
import { type DietListStatus, useDietPlanList } from '../hooks/useDietPlanList';

const FILTERS: readonly { value: DietListStatus; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'finished', label: 'Finalizadas' },
];

/** Aba do especialista no mesmo kit de vidro do wizard (#337). */
export default function NutritionScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const canRead = useAuthStore((s) => !!s.abilities?.can('read', 'Diet'));
  const canCreate = useAuthStore((s) => !!s.abilities?.can('create', 'Diet'));
  const list = useDietPlanList(userId, canRead);
  const [limit, setLimit] = useState(20);
  const createPlan = () => router.push(ROUTES.NUTRITION.WIZARD_START);
  const count = list.plans?.length;

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('legs')}
      bottomSpace={canCreate ? 'fixedButton' : 'tab'}
      refresh={
        canRead
          ? {
              refreshing: list.isFetching && list.plans !== undefined,
              onRefresh: () => void list.refetch(),
            }
          : undefined
      }
      overlay={
        canCreate ? (
          <BotaoFixoNoRodape rotulo="Nova dieta" icone="add" onPress={createPlan} />
        ) : undefined
      }
    >
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
            {count === undefined
              ? 'Planos alimentares'
              : `${count} ${count === 1 ? 'plano alimentar' : 'planos alimentares'}`}
          </Text>
          <Text className="mt-0.5 text-[1.375rem] font-bold tracking-tight text-hero">
            Nutrição
          </Text>
        </View>
        {canCreate && (
          <BotaoRedondo icone="plus" rotulo="Criar plano alimentar" onPress={createPlan} />
        )}
      </View>
      {!canRead ? (
        <Text accessibilityRole="alert" className="py-6 text-sm text-muted-foreground">
          Sua conta não tem permissão para acessar dietas.
        </Text>
      ) : (
        <>
          <GlassSearchField
            value={list.search}
            onChangeText={(value) => {
              list.setSearch(value);
              setLimit(20);
            }}
            placeholder="Buscar aluno ou plano…"
            className="mt-4"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerClassName="gap-2"
            keyboardShouldPersistTaps="handled"
          >
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                accessibilityRole="radio"
                accessibilityLabel={filter.label}
                accessibilityState={{ selected: list.status === filter.value }}
                onPress={() => {
                  list.setStatus(filter.value);
                  setLimit(20);
                }}
              >
                <Chip tom={list.status === filter.value ? 'destaque' : 'neutro'}>
                  {filter.label}
                </Chip>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TituloDeSecao estilo="rotulo">Planos alimentares</TituloDeSecao>
          <DietListFeedback
            loaded={list.plans !== undefined}
            error={!!list.error}
            paused={list.fetchStatus === 'paused'}
            onRetry={() => void list.refetch()}
            noun="planos"
          />
          {list.plans !== undefined && list.visible.length === 0 && (
            <View className="gap-3 py-6">
              <Text className="text-sm text-muted-foreground">
                {list.plans.length === 0
                  ? 'Nenhuma dieta criada ainda. Comece em Nova dieta.'
                  : 'Nenhum plano encontrado com esta busca ou filtro.'}
              </Text>
              {(list.search !== '' || list.status !== 'all') && (
                <ToggleChip
                  active={false}
                  onPress={() => {
                    list.setSearch('');
                    list.setStatus('all');
                  }}
                >
                  Limpar filtros
                </ToggleChip>
              )}
            </View>
          )}
          {list.visible.slice(0, limit).map((plan) => (
            <DietPlanListCard
              key={plan.id}
              plan={plan}
              onPress={() =>
                router.push(
                  plan.status === 'draft'
                    ? { pathname: ROUTES.NUTRITION.WIZARD_PLAN, params: { planId: plan.id } }
                    : ROUTES.NUTRITION.PLAN(plan.id)
                )
              }
            />
          ))}
          {list.visible.length > limit && (
            <ToggleChip active={false} onPress={() => setLimit((current) => current + 20)}>
              Mostrar mais planos
            </ToggleChip>
          )}
        </>
      )}
    </TelaDeVidroComFoto>
  );
}
