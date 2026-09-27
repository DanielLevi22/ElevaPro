import { createNutritionService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { DietListFeedback } from '../../components/diet/DietListFeedback';
import { DietSummaryCard } from '../../components/diet/DietSummaryCard';
import { MealBuilderCard } from '../../components/diet/MealBuilderCard';
import { WeekdayStrip } from '../../components/diet/WeekdayStrip';
import { useDietPlanEditor } from '../../hooks/useDietPlanEditor';
import { numeroDoBanco } from '../../services/consumoDoDia';
import { formatKcal } from '../../services/dietPlanSummary';

const nutrition = createNutritionService(supabase);
const STATUS = { draft: 'Rascunho', active: 'Ativo', finished: 'Finalizado' } as const;

/** Plano enviado em leitura. Só a ação Editar abre a montagem, sobre outra versão. */
export default function DietPlanViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const editor = useDietPlanEditor(id);
  const userId = useAuthStore((s) => s.user?.id);
  const canUpdate = useAuthStore((s) => !!s.abilities?.can('update', 'Diet'));
  const [opening, setOpening] = useState(false);
  const pending = useRef(false);
  const plan = editor.plan;
  const ownsPlan =
    !!plan &&
    (plan.specialist_id === userId || (plan.specialist_id === null && plan.student_id === userId));
  const canEdit = canUpdate && ownsPlan && plan?.status !== 'finished';

  async function editPlan() {
    if (!plan || !canEdit || pending.current) return;
    pending.current = true;
    setOpening(true);
    try {
      const draft = plan.status === 'draft' ? plan : await nutrition.createDietPlanVersion(plan.id);
      router.push({ pathname: ROUTES.NUTRITION.WIZARD_PLAN, params: { planId: draft.id } });
    } catch {
      showAlert({
        title: 'Não foi possível abrir a edição',
        message: 'O plano enviado foi preservado. Tente novamente.',
        type: 'error',
      });
    } finally {
      pending.current = false;
      setOpening(false);
    }
  }

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('back')}
      bottomSpace={canEdit ? 'fixedButton' : 'tab'}
      overlay={
        canEdit ? (
          <BotaoFixoNoRodape
            rotulo={
              opening
                ? 'Abrindo edição…'
                : plan?.status === 'draft'
                  ? 'Continuar edição'
                  : 'Editar plano'
            }
            icone="create-outline"
            disabled={opening}
            onPress={editPlan}
          />
        ) : undefined
      }
    >
      <CabecalhoSobreFoto
        sobrelinha={plan ? `Versão ${plan.version} · plano alimentar` : 'Plano alimentar'}
        titulo="Plano alimentar"
        onVoltar={router.back}
      />
      <DietListFeedback
        loaded={!editor.loading}
        error={editor.error}
        paused={false}
        onRetry={() => void editor.reload()}
        noun="planos"
      />
      {plan && (
        <>
          <DietSummaryCard
            name={plan.name || 'Plano alimentar'}
            subtitle={`Meta diária · ${formatKcal(numeroDoBanco(plan.target_calories))} kcal`}
            status={STATUS[plan.status]}
            highlighted={plan.status === 'active'}
            protein={plan.target_protein == null ? null : numeroDoBanco(plan.target_protein)}
            carbs={plan.target_carbs == null ? null : numeroDoBanco(plan.target_carbs)}
            fat={plan.target_fat == null ? null : numeroDoBanco(plan.target_fat)}
          />
          <Text className="mt-3 text-[0.75rem] text-muted-foreground">
            {plan.plan_type === 'unique'
              ? 'Mesmo cardápio todos os dias'
              : 'Cardápio por dia da semana'}
          </Text>
          {canEdit && plan.status === 'active' && (
            <Text className="mt-3 text-xs text-muted-foreground">
              Ao editar, você ajusta um rascunho. Este plano continua valendo até o envio da nova
              versão.
            </Text>
          )}
          {plan.plan_type === 'cyclic' && (
            <WeekdayStrip value={editor.day} onChange={editor.setDay} />
          )}
          <TituloDeSecao estilo="rotulo">Refeições</TituloDeSecao>
          {editor.mealsOfTheDay.map((meal) => (
            <MealBuilderCard key={meal.id} meal={meal} />
          ))}
          {editor.mealsOfTheDay.length === 0 && (
            <Text className="py-4 text-sm text-muted-foreground">Nenhuma refeição neste dia.</Text>
          )}
          {!!plan.notes && (
            <>
              <TituloDeSecao estilo="rotulo">Mensagem do plano</TituloDeSecao>
              <Vidro className="p-3.5">
                <Text selectable className="text-[0.78125rem] leading-[1.45] text-muted-foreground">
                  {plan.notes}
                </Text>
              </Vidro>
            </>
          )}
        </>
      )}
    </TelaDeVidroComFoto>
  );
}
