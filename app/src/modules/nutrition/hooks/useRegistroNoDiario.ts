import {
  createDiarioAlimentar,
  type DietMeal,
  type ItemRegistrado,
  refeicaoMaisProxima,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { useNutritionStore } from '../store/nutritionStore';
import { AVISO_DE_MODO_LEITURA, type PlanoDoDia, usePlanoDoDia } from './usePlanoDoDia';

const diario = createDiarioAlimentar(supabase);

/** O que espera a escolha da refeição para ser gravado. */
export interface PedidoDeRegistro {
  /** Como o item aparece no diálogo: "100 g de Banana", "Bowl, 380 kcal estimadas". */
  descricao: string;
  /** Um item, ou um por componente do prato do scan. */
  extras: Omit<ItemRegistrado, 'id'>[];
}

export interface RegistroNoDiario {
  plano: PlanoDoDia;
  pedido: PedidoDeRegistro | null;
  refeicoes: DietMeal[];
  refeicaoEscolhida: string | null;
  escolherRefeicao: (refeicaoId: string) => void;
  pedir: (pedido: PedidoDeRegistro) => void;
  confirmar: () => void;
  cancelar: () => void;
}

/**
 * O registro de um item extra no que o aluno comeu hoje, com a refeição
 * escolhida antes de gravar.
 *
 * A sugestão é a refeição de horário mais perto de agora. Sem horário em
 * nenhuma, nada vem escolhido: a issue proíbe escolher sozinho, e o aluno toca
 * na refeição.
 *
 * @example
 * const registro = useRegistroNoDiario(user.id, { somenteLeitura });
 * registro.pedir({ descricao: '100 g de Banana', extras: [extra] });
 */
export function useRegistroNoDiario(
  alunoId: string,
  { somenteLeitura }: { somenteLeitura: boolean }
): RegistroNoDiario {
  const plano = usePlanoDoDia(alunoId, { somenteLeitura });
  const refeicoes = plano.refeicoes.map((r) => r.refeicao);
  const [pedido, setPedido] = useState<PedidoDeRegistro | null>(null);
  const [refeicaoEscolhida, setRefeicaoEscolhida] = useState<string | null>(null);

  const pedir = (novo: PedidoDeRegistro) => {
    if (somenteLeitura) return showAlert(AVISO_DE_MODO_LEITURA);
    if (refeicoes.length === 0) {
      return showAlert({
        title: 'Sem refeição hoje',
        message: 'Seu plano não tem refeição para hoje.',
      });
    }
    const agora = new Date().toTimeString().slice(0, 5);
    setRefeicaoEscolhida(refeicaoMaisProxima(refeicoes, agora)?.id ?? null);
    setPedido(novo);
  };

  const confirmar = () => {
    if (!pedido || !refeicaoEscolhida) return;
    gravar({ alunoId, dia: plano.hoje, refeicaoId: refeicaoEscolhida, pedido }).then(
      plano.recarregar
    );
    setPedido(null);
  };

  return {
    plano,
    pedido,
    refeicoes,
    refeicaoEscolhida,
    escolherRefeicao: setRefeicaoEscolhida,
    pedir,
    confirmar,
    cancelar: () => setPedido(null),
  };
}

interface Gravacao {
  alunoId: string;
  dia: string;
  refeicaoId: string;
  pedido: PedidoDeRegistro;
}

async function gravar({ alunoId, dia, refeicaoId, pedido }: Gravacao): Promise<void> {
  const { currentDietPlan, mealItems } = useNutritionStore.getState();
  if (!currentDietPlan) return;
  try {
    await diario.registrarItemExtra({
      alunoId,
      planoId: currentDietPlan.id,
      refeicaoId,
      data: dia,
      doPlano: mealItems[refeicaoId] ?? [],
      extras: pedido.extras,
    });
    showAlert({
      title: 'Registrado',
      message: `${pedido.descricao} entrou no que você comeu hoje.`,
      type: 'success',
    });
  } catch {
    showAlert({
      title: 'Não deu para registrar',
      message: 'Confira a conexão e tente de novo.',
      type: 'error',
    });
  }
}
