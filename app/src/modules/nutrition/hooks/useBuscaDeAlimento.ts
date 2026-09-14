import {
  createNutritionService,
  type DietMeal,
  type Food,
  refeicaoMaisProxima,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { numeroDoBanco } from '../services/consumoDoDia';
import { registrarNoDiario } from '../services/registrarNoDiario';
import { useNutritionStore } from '../store/nutritionStore';
import { usePlanoDoDia } from './usePlanoDoDia';

const nutricao = createNutritionService(supabase);

/** Espera o aluno parar de digitar antes de ir ao banco. */
const ESPERA_DA_DIGITACAO = 300;
const RESULTADOS = 20;
const MINIMO_PARA_BUSCAR = 2;

export interface BuscaDeAlimento {
  consulta: string;
  digitar: (texto: string) => void;
  categoria: string | null;
  escolherCategoria: (categoria: string | null) => void;
  maisProteina: boolean;
  alternarMaisProteina: () => void;
  resultados: Food[];
  buscando: boolean;
  faltamCalorias: number;
  adicionar: (food: Food) => void;
}

/**
 * A busca no catálogo do aluno, e o "+" que põe o alimento no registro de hoje.
 *
 * O alimento entra na refeição de hoje com horário mais perto de agora, na
 * porção de referência do catálogo. O aluno confirma antes, vendo qual.
 *
 * @example
 * const busca = useBuscaDeAlimento(user.id, { somenteLeitura: isMasquerading });
 */
export function useBuscaDeAlimento(
  alunoId: string,
  { somenteLeitura }: { somenteLeitura: boolean }
): BuscaDeAlimento {
  const plano = usePlanoDoDia(alunoId, { somenteLeitura });
  const [consulta, setConsulta] = useState('');
  const [categoria, setCategoria] = useState<string | null>('proteina');
  const [maisProteina, setMaisProteina] = useState(false);
  const { resultados, buscando } = useResultados(consulta, categoria);

  const adicionar = (food: Food) => {
    if (somenteLeitura) {
      return showAlert({
        title: 'Modo leitura',
        message: 'Você está vendo como o aluno. Não dá para registrar por ele.',
      });
    }
    const refeicao = refeicaoParaAgora(plano.refeicoes.map((r) => r.refeicao));
    if (!refeicao) {
      return showAlert({
        title: 'Sem refeição hoje',
        message: 'Seu plano não tem refeição para hoje.',
      });
    }
    confirmarRegistro({ alunoId, food, refeicao, aoGravar: plano.recarregar });
  };

  return {
    consulta,
    digitar: setConsulta,
    categoria,
    escolherCategoria: setCategoria,
    maisProteina,
    alternarMaisProteina: () => setMaisProteina((atual) => !atual),
    resultados: maisProteina ? [...resultados].sort(porProteina) : resultados,
    buscando,
    faltamCalorias: Math.max(0, Math.round(plano.meta.calorias - plano.consumo.calorias)),
    adicionar,
  };
}

/** Texto digitado manda; sem texto, a categoria escolhida. */
function useResultados(consulta: string, categoria: string | null) {
  const [resultados, setResultados] = useState<Food[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setBuscando(true);
    const espera = setTimeout(() => {
      buscar(consulta.trim(), categoria)
        .then((lista) => ativo && setResultados(lista))
        .catch(() => ativo && setResultados([]))
        .finally(() => ativo && setBuscando(false));
    }, ESPERA_DA_DIGITACAO);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [consulta, categoria]);

  return { resultados, buscando };
}

async function buscar(consulta: string, categoria: string | null): Promise<Food[]> {
  if (consulta.length >= MINIMO_PARA_BUSCAR) {
    const achados = await nutricao.searchFoods(consulta, 0, RESULTADOS);
    return categoria ? achados.filter((food) => food.category === categoria) : achados;
  }
  if (categoria) return nutricao.fetchFoodsByCategory(categoria, RESULTADOS);
  return nutricao.fetchFoods(RESULTADOS);
}

function porProteina(a: Food, b: Food): number {
  const densidade = (food: Food) =>
    numeroDoBanco(food.calories) > 0
      ? numeroDoBanco(food.protein) / numeroDoBanco(food.calories)
      : 0;
  return densidade(b) - densidade(a);
}

/**
 * O que do Food vai para o registro: o que a soma e a tela usam. `created_by`
 * e datas do catálogo não têm o que fazer no que o aluno comeu (Art. 6°, III).
 */
function doCatalogo(food: Food) {
  const { id, name, category, serving_size, serving_unit, calories, protein, carbs, fat } = food;
  return { id, name, category, serving_size, serving_unit, calories, protein, carbs, fat };
}

/** A refeição de horário mais perto de agora; sem horário em nenhuma, a primeira. */
function refeicaoParaAgora(refeicoes: DietMeal[]): DietMeal | null {
  const agora = new Date().toTimeString().slice(0, 5);
  return refeicaoMaisProxima(refeicoes, agora) ?? refeicoes[0] ?? null;
}

interface Confirmacao {
  alunoId: string;
  food: Food;
  refeicao: DietMeal;
  aoGravar: () => void;
}

function confirmarRegistro({ alunoId, food, refeicao, aoGravar }: Confirmacao) {
  const quantidade = numeroDoBanco(food.serving_size) || 100;
  showConfirm({
    title: `Adicionar ao ${refeicao.name}?`,
    message: `${quantidade} ${food.serving_unit} de ${food.name} entram no que você comeu hoje.`,
    confirmText: 'Adicionar',
    onConfirm: () => gravar({ alunoId, food, refeicao, quantidade, aoGravar }),
  });
}

async function gravar({
  alunoId,
  food,
  refeicao,
  quantidade,
  aoGravar,
}: Confirmacao & { quantidade: number }) {
  const { currentDietPlan, mealItems } = useNutritionStore.getState();
  if (!currentDietPlan) return;
  try {
    await registrarNoDiario({
      alunoId,
      planoId: currentDietPlan.id,
      refeicaoId: refeicao.id,
      // Data local: em UTC, o jantar das 21h no Brasil caía no dia seguinte.
      data: getLocalDateISOString(),
      doPlano: mealItems[refeicao.id] ?? [],
      extra: {
        quantity: quantidade,
        unit: food.serving_unit,
        food: doCatalogo(food),
        origem: 'busca',
      },
    });
    aoGravar();
  } catch {
    showAlert({
      title: 'Não deu para registrar',
      message: 'Confira a conexão e tente de novo.',
      type: 'error',
    });
  }
}
