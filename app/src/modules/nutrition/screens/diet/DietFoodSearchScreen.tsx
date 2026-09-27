import type { Food } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { GlassSearchField } from '@/components/ui/GlassSearchField';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { CategoriasDoCatalogo } from '../../components/aluno/CategoriasDoCatalogo';
import { LinhaDoAlimento } from '../../components/aluno/LinhaDoAlimento';
import { useDietPlanEditor } from '../../hooks/useDietPlanEditor';
import { useFoodCatalogSearch } from '../../hooks/useFoodCatalogSearch';
import { numeroDoBanco } from '../../services/consumoDoDia';

const MARK_SIZE = 20;

function portionLine(food: Food): string {
  const portion = numeroDoBanco(food.serving_size) || 100;
  return `${portion} ${food.serving_unit} · ${Math.round(numeroDoBanco(food.calories))} kcal`;
}

/**
 * Buscar alimentos para uma refeição do plano (#337), no desenho da Biblioteca
 * de exercícios do kit (tela 10): busca, categorias e seleção de vários. Cada
 * um entra na porção de referência do catálogo; a quantidade se ajusta na
 * refeição. A busca é a mesma do aluno.
 */
export default function DietFoodSearchScreen() {
  const router = useRouter();
  const { planId, mealId } = useLocalSearchParams<{ planId: string; mealId: string }>();
  const editor = useDietPlanEditor(planId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Food[]>([]);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const { results, searching } = useFoodCatalogSearch(query, category);
  const mealName = editor.meals.find((meal) => meal.id === mealId)?.name ?? 'Refeição';

  const toggle = (food: Food) =>
    setSelected((current) =>
      current.some((item) => item.id === food.id)
        ? current.filter((item) => item.id !== food.id)
        : [...current, food]
    );

  async function add() {
    if (selected.length === 0 || pending.current || !editor.canEdit) return;
    pending.current = true;
    setSaving(true);
    const saved = await editor.addFoods(mealId, selected);
    pending.current = false;
    setSaving(false);
    if (saved) router.back();
  }

  const count = selected.length;
  if (editor.plan && !editor.canEdit) return <Redirect href={ROUTES.NUTRITION.PLAN(planId)} />;
  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('arms')}
      bottomSpace="fixedButton"
      overlay={
        <BotaoFixoNoRodape
          rotulo={
            saving
              ? 'Adicionando…'
              : count === 0
                ? 'Escolha os alimentos'
                : `Adicionar ${count} ${count === 1 ? 'alimento' : 'alimentos'}`
          }
          icone="add"
          onPress={add}
          disabled={saving || !editor.canEdit || count === 0}
        />
      }
    >
      <CabecalhoSobreFoto sobrelinha={mealName} titulo="Alimentos" onVoltar={router.back} />
      <GlassSearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar alimento…"
        className="mt-4"
      />
      <TituloDeSecao
        estilo="rotulo"
        acao={showAll ? 'Menos' : 'Ver tudo'}
        onAcao={() => setShowAll((current) => !current)}
      >
        Categorias
      </TituloDeSecao>
      <CategoriasDoCatalogo escolhida={category} todas={showAll} onEscolher={setCategory} />
      <TituloDeSecao estilo="rotulo" acao={count > 0 ? `${count} selecionados` : undefined}>
        {searching ? 'Buscando…' : `Resultados · ${results.length}`}
      </TituloDeSecao>
      {results.map((food) => (
        <FoodResult
          key={food.id}
          food={food}
          chosen={selected.some((item) => item.id === food.id)}
          onPress={() => toggle(food)}
        />
      ))}
      {!searching && results.length === 0 && (
        <Text className="text-[0.8125rem] text-muted-foreground">Nenhum alimento encontrado.</Text>
      )}
    </TelaDeVidroComFoto>
  );
}

function FoodResult({
  food,
  chosen,
  onPress,
}: {
  food: Food;
  chosen: boolean;
  onPress: () => void;
}) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <LinhaDoAlimento
      icone="nutrition-outline"
      nome={food.name}
      sub={portionLine(food)}
      onPress={onPress}
      rotuloDeAcessibilidade={`${chosen ? 'Desmarcar' : 'Escolher'} ${food.name}`}
      direita={
        <Ionicons
          name={chosen ? 'checkmark-circle' : 'ellipse-outline'}
          size={escalar(MARK_SIZE)}
          color={chosen ? cores.primaryText : cores.placeholder}
        />
      }
    />
  );
}
