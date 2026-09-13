import type { Workout } from '@elevapro/shared';
import { useEffect, useState } from 'react';
import { useWorkoutStore } from '../store/workoutStore';

/**
 * O treino com os exercícios, para o detalhe.
 *
 * Quem vem da fase já tem o treino na store, com os exercícios; quem chega por
 * link direto — ou pelo cartão da tela inicial — não, e o hook o busca.
 *
 * @example
 * const { treino, naoEncontrado } = useDetalheDoTreino(id);
 */
interface DetalheDoTreino {
  treino: Workout | null;
  naoEncontrado: boolean;
}

export function useDetalheDoTreino(treinoId: string): DetalheDoTreino {
  const { workouts, fetchWorkoutById } = useWorkoutStore();
  const daLoja = workouts.find((w) => w.id === treinoId && w.exercises);
  const [buscado, setBuscado] = useState<Workout | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    if (daLoja || !treinoId) return;
    let ativo = true;
    fetchWorkoutById(treinoId).then((treino) => {
      if (!ativo) return;
      setBuscado(treino);
      setNaoEncontrado(!treino);
    });
    return () => {
      ativo = false;
    };
  }, [daLoja, treinoId, fetchWorkoutById]);

  return { treino: daLoja ?? buscado, naoEncontrado };
}
