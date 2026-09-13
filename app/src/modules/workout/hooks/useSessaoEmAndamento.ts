import { MS_POR_SEGUNDO, type WorkoutExercise } from '@elevapro/shared';
import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  emAndamento,
  estadoInicial,
  transicionar,
} from '../store/maquinaDaSessao';

const TIQUE_MS = MS_POR_SEGUNDO;

/**
 * A sessão de treino em andamento: o estado da máquina e o relógio.
 *
 * O relógio só bate da execução ao descanso — é o que redesenha o "18:24 em
 * execução" e o anel —, e cada tique também avisa a máquina, que encerra o
 * descanso quando o tempo acaba. Fora desses momentos não há por que acordar a
 * tela a cada segundo.
 *
 * @example
 * const { sessao, agora, despachar } = useSessaoEmAndamento(treino.exercises ?? []);
 * despachar({ tipo: 'abrirSerie' });
 */
export function useSessaoEmAndamento(itens: WorkoutExercise[]): {
  sessao: EstadoDaSessao;
  agora: number;
  despachar: (acao: AcaoDaSessao) => void;
} {
  const [sessao, despachar] = useReducer(transicionar, itens, estadoInicial);
  const [agora, setAgora] = useState(Date.now);
  const correndo = emAndamento(sessao.momento);

  useEffect(() => {
    if (!correndo) return;
    const intervalo = setInterval(() => {
      const instante = Date.now();
      setAgora(instante);
      despachar({ tipo: 'tique', agora: instante });
    }, TIQUE_MS);
    return () => clearInterval(intervalo);
  }, [correndo]);

  // A ação leva o instante de quando aconteceu, e não o do último tique: o
  // check registrado a 0,9 s do tique anterior não pode começar o descanso
  // 0,9 s atrasado.
  const despacharAgora = useCallback((acao: AcaoDaSessao) => {
    if ('agora' in acao) setAgora(acao.agora);
    despachar(acao);
  }, []);

  return { sessao, agora, despachar: despacharAgora };
}
