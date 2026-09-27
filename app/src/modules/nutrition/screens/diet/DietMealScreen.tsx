import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { FormField } from '@/components/ui/FormField';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { DashedAddButton } from '../../components/diet/DashedAddButton';
import { MealItemRow } from '../../components/diet/MealItemRow';
import { ToggleChip } from '../../components/diet/ToggleChip';
import { type MealDraft, type PlanMeal, useDietPlanEditor } from '../../hooks/useDietPlanEditor';

// As sugestões do "Adicionar refeição" do web, na mesma ordem.
const MEAL_SUGGESTIONS = [
  { name: 'Café da Manhã', time: '08:00' },
  { name: 'Lanche da Manhã', time: '10:30' },
  { name: 'Almoço', time: '13:00' },
  { name: 'Lanche da Tarde', time: '16:00' },
  { name: 'Pré-Treino', time: '18:00' },
  { name: 'Jantar', time: '19:30' },
  { name: 'Pós-Treino', time: '19:30' },
  { name: 'Ceia', time: '22:00' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
function numberOrNull(text: string): number | null {
  const value = Number(text);
  return text.trim() && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function draftOf(meal: PlanMeal | undefined): Record<keyof MealDraft, string> {
  return {
    name: meal?.name ?? '',
    meal_time: meal?.meal_time?.slice(0, 5) ?? '',
    prep_minutes: meal?.prep_minutes ? String(meal.prep_minutes) : '',
    servings: meal?.servings ? String(meal.servings) : '',
    difficulty: meal?.difficulty ?? '',
  };
}

/**
 * Adicionar ou editar uma refeição do plano (#337): nome e horário — com as
 * sugestões do web —, preparo e porções, e os alimentos com a quantidade. É a
 * tela que o mock não desenha, no estilo do bloco E.
 */
export default function DietMealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId: string; mealId?: string; day?: string }>();
  const editor = useDietPlanEditor(params.planId, Number(params.day ?? 1));
  const meal = editor.meals.find((current) => current.id === params.mealId);
  const [form, setForm] = useState(draftOf(meal));
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  // O plano chega depois da primeira pintura: o formulário espera por ele.
  // biome-ignore lint/correctness/useExhaustiveDependencies: preencher só quando a refeição chega
  useEffect(() => {
    if (meal) setForm(draftOf(meal));
  }, [meal?.id]);

  async function save() {
    if (pending.current || !editor.canEdit) return;
    if (!form.name.trim()) {
      showAlert({ title: 'Falta o nome', message: 'Dê um nome à refeição.', type: 'info' });
      return;
    }
    if (form.meal_time && !TIME_PATTERN.test(form.meal_time)) {
      showAlert({
        title: 'Horário inválido',
        message: `"${form.meal_time}" não é um horário. Use HH:MM, como 07:30.`,
        type: 'info',
      });
      return;
    }
    pending.current = true;
    setSaving(true);
    const savedId = await editor.saveMeal(
      {
        name: form.name.trim(),
        meal_time: form.meal_time || null,
        prep_minutes: numberOrNull(form.prep_minutes),
        servings: numberOrNull(form.servings),
        difficulty: (form.difficulty || null) as MealDraft['difficulty'],
      },
      meal?.id
    );
    pending.current = false;
    setSaving(false);
    if (!savedId) return;
    // Refeição nova segue aberta, agora com id, para receber os alimentos.
    if (meal) router.back();
    else router.setParams({ mealId: savedId });
  }

  const confirmDelete = () =>
    showConfirm({
      title: 'Apagar a refeição?',
      message: 'Ela e os alimentos dela saem do plano.',
      type: 'danger',
      confirmText: 'Apagar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        if (!meal) return;
        if (await editor.deleteMeal(meal.id)) router.back();
      },
    });

  if (editor.plan && !editor.canEdit)
    return <Redirect href={ROUTES.NUTRITION.PLAN(params.planId)} />;

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('chest')}
      bottomSpace="fixedButton"
      overlay={
        <BotaoFixoNoRodape
          rotulo={saving ? 'Salvando…' : meal ? 'Salvar refeição' : 'Criar refeição'}
          icone="checkmark"
          onPress={save}
          disabled={saving || !editor.canEdit}
        />
      }
    >
      <CabecalhoSobreFoto
        sobrelinha="Refeição"
        titulo={meal?.name ?? 'Nova refeição'}
        onVoltar={router.back}
        direita={
          meal ? (
            <BotaoRedondo icone="trash-2" rotulo="Apagar a refeição" onPress={confirmDelete} />
          ) : undefined
        }
      />

      {!meal && (
        <>
          <TituloDeSecao estilo="rotulo">Sugestões</TituloDeSecao>
          <View className="flex-row flex-wrap gap-2">
            {MEAL_SUGGESTIONS.map((suggestion) => (
              <ToggleChip
                key={suggestion.name}
                active={form.name === suggestion.name}
                onPress={() => set({ name: suggestion.name, meal_time: suggestion.time })}
              >
                {suggestion.name}
              </ToggleChip>
            ))}
          </View>
        </>
      )}

      <Vidro classeExterna="mt-4" className="p-4 pb-1">
        <FormField
          label="Nome"
          icon="restaurant-outline"
          value={form.name}
          onChangeText={(name) => set({ name })}
          placeholder="Ex.: Almoço"
          autoCapitalize="sentences"
        />
        <FormField
          label="Horário"
          icon="time-outline"
          value={form.meal_time}
          onChangeText={(meal_time) => set({ meal_time })}
          placeholder="07:30"
          keyboardType="numbers-and-punctuation"
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              label="Preparo (min)"
              icon="hourglass-outline"
              value={form.prep_minutes}
              onChangeText={(prep_minutes) => set({ prep_minutes })}
              placeholder="—"
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Porções"
              icon="people-outline"
              value={form.servings}
              onChangeText={(servings) => set({ servings })}
              placeholder="—"
              keyboardType="number-pad"
            />
          </View>
        </View>
      </Vidro>

      <TituloDeSecao estilo="rotulo">Dificuldade do preparo</TituloDeSecao>
      <View className="flex-row flex-wrap gap-2">
        {(
          [
            { value: '', label: 'Não informada' },
            { value: 'facil', label: 'Fácil' },
            { value: 'media', label: 'Média' },
            { value: 'dificil', label: 'Difícil' },
          ] as const
        ).map((option) => (
          <ToggleChip
            key={option.value}
            active={form.difficulty === option.value}
            onPress={() => set({ difficulty: option.value })}
          >
            {option.label}
          </ToggleChip>
        ))}
      </View>

      {meal && (
        <>
          <TituloDeSecao estilo="rotulo">Alimentos</TituloDeSecao>
          {meal.diet_meal_items.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              onQuantity={(quantity) => editor.setItemQuantity(item.id, quantity)}
              onRemove={() => editor.removeItem(item.id)}
            />
          ))}
          <DashedAddButton
            label="Adicionar alimentos"
            onPress={() =>
              router.push({
                pathname: ROUTES.NUTRITION.WIZARD_FOOD_SEARCH,
                params: { planId: params.planId, mealId: meal.id },
              })
            }
          />
        </>
      )}
    </TelaDeVidroComFoto>
  );
}
