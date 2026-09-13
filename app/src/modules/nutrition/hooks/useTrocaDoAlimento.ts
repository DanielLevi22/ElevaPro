import { createNutritionService, type DietMeal, type Food } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { type ItemDoPrato, itensDaRefeicao } from '../services/consumoDoDia';
import {
  type Equivalente,
  equivalentesDaTroca,
  type OrdemDosEquivalentes,
  ordenarEquivalentes,
} from '../services/equivalenciaDaTroca';
import { useNutritionStore } from '../store/nutritionStore';

const nutricao = createNutritionService(supabase);

/** Quantos alimentos da categoria entram como candidatos. */
const CANDIDATOS = 60;

export interface TrocaDoAlimento {
  refeicao: DietMeal | null;
  original: ItemDoPrato | null;
  equivalentes: Equivalente[];
  carregando: boolean;
  ordem: OrdemDosEquivalentes;
  alternarOrdem: () => void;
  escolhido: Equivalente | null;
  escolher: (equivalente: Equivalente) => void;
  /** Grava a troca. Devolve `true` quando gravou, para a tela voltar. */
  confirmar: () => Promise<boolean>;
}

interface EntradaDaTroca {
  refeicaoId: string;
  itemId: string;
  data: string;
  somenteLeitura: boolean;
}

/**
 * A troca de um alimento do prato por um equivalente que mantém a proteína.
 *
 * Os candidatos vêm da mesma categoria do catálogo: frango por peixe, arroz por
 * batata. Alimento sem categoria busca no catálogo inteiro, e a equivalência
 * descarta o que não serve.
 *
 * @example
 * const troca = useTrocaDoAlimento({ refeicaoId, itemId, data, somenteLeitura });
 */
export function useTrocaDoAlimento({
  refeicaoId,
  itemId,
  data,
  somenteLeitura,
}: EntradaDaTroca): TrocaDoAlimento {
  const refeicao = useNutritionStore((s) => s.meals.find((r) => r.id === refeicaoId) ?? null);
  const registro = useNutritionStore((s) => s.dailyLogs[refeicaoId]);
  const doPlano = useNutritionStore((s) => s.mealItems[refeicaoId]);
  const original = itensDaRefeicao(registro, doPlano).find((item) => item.id === itemId) ?? null;
  const categoria = original?.food?.category ?? null;
  const [candidatos, setCandidatos] = useState<Food[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ordem, setOrdem] = useState<OrdemDosEquivalentes>('calorias');
  const [escolhido, setEscolhido] = useState<Equivalente | null>(null);

  useEffect(() => {
    let ativo = true;
    buscarCandidatos(categoria)
      .then((lista) => ativo && setCandidatos(lista))
      .catch(() => ativo && setCandidatos([]))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [categoria]);

  const confirmar = async () => {
    if (!original || !escolhido) return false;
    if (somenteLeitura) {
      showAlert({
        title: 'Modo leitura',
        message: 'Você está vendo como o aluno. Não dá para trocar por ele.',
      });
      return false;
    }
    return gravarTroca({ refeicaoId, data, original, escolhido });
  };

  return {
    refeicao,
    original,
    equivalentes: original
      ? ordenarEquivalentes(equivalentesDaTroca(original, candidatos), ordem)
      : [],
    carregando,
    ordem,
    alternarOrdem: () => setOrdem((atual) => (atual === 'calorias' ? 'proteina' : 'calorias')),
    escolhido,
    escolher: setEscolhido,
    confirmar,
  };
}

function buscarCandidatos(categoria: string | null): Promise<Food[]> {
  return categoria
    ? nutricao.fetchFoodsByCategory(categoria, CANDIDATOS)
    : nutricao.fetchFoods(CANDIDATOS);
}

interface Gravacao {
  refeicaoId: string;
  data: string;
  original: ItemDoPrato;
  escolhido: Equivalente;
}

async function gravarTroca({ refeicaoId, data, original, escolhido }: Gravacao): Promise<boolean> {
  try {
    await useNutritionStore
      .getState()
      .substituteFood(
        refeicaoId,
        data,
        original.id,
        escolhido.food,
        escolhido.quantidade,
        escolhido.food.serving_unit
      );
    return true;
  } catch {
    showAlert({
      title: 'Não deu para trocar',
      message: 'Confira a conexão e tente de novo.',
      type: 'error',
    });
    return false;
  }
}
