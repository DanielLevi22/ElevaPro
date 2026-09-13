import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceCoach } from '@/hooks/useVoiceCoach';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import type { VoiceAction } from '../services/VoiceCommandService';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  emAndamento,
  proximaSerie,
} from '../store/maquinaDaSessao';

interface VozDaSessao {
  mudo: boolean;
  alternarMudo: () => void;
  ouvindo: boolean;
  alternarMicrofone: () => void;
}

/**
 * A voz da sessão: o que o coach anuncia a cada mudança de momento e o que o
 * aluno pode mandar falando.
 *
 * Os anúncios saem da **transição**, e não de quem a provocou: o descanso que
 * acaba sozinho e o que o aluno encerra no botão anunciam a mesma série. Na
 * tela antiga cada caminho chamava o anúncio à mão, e o fim do descanso por
 * tempo era o único que avisava.
 *
 * @example
 * const voz = useVozDaSessao(sessao, despachar, pedirParaFinalizar);
 */
export function useVozDaSessao(
  sessao: EstadoDaSessao,
  despachar: (acao: AcaoDaSessao) => void,
  pedirParaFinalizar: () => void
): VozDaSessao {
  const coach = useVoiceCoach();
  // O coach devolve funções novas a cada render: guardadas em ref, os efeitos
  // abaixo dependem só da sessão.
  const coachRef = useRef(coach);
  coachRef.current = coach;

  useAnuncios(sessao, coachRef);
  const microfone = useMicrofone(sessao, despachar, pedirParaFinalizar, coachRef);

  return { mudo: coach.isMuted, alternarMudo: coach.toggleMute, ...microfone };
}

type CoachRef = { current: ReturnType<typeof useVoiceCoach> };

function useAnuncios(sessao: EstadoDaSessao, coachRef: CoachRef): void {
  const momentoAnterior = useRef(sessao.momento);
  const atualAnterior = useRef(sessao.atualId);

  useEffect(() => {
    const coach = coachRef.current;
    const deOnde = momentoAnterior.current;
    const trocouDeExercicio = atualAnterior.current !== sessao.atualId;
    momentoAnterior.current = sessao.momento;
    atualAnterior.current = sessao.atualId;
    const proxima = proximaSerie(sessao);

    if (sessao.momento === 'descanso' && deOnde !== 'descanso' && sessao.descanso) {
      coach.announceRest(sessao.descanso.total);
    } else if (
      sessao.momento === 'execucao' &&
      proxima &&
      (deOnde === 'preInicio' || trocouDeExercicio)
    ) {
      const { item } = proxima;
      coach.announceExercise(
        item.exercise?.name ?? 'exercício',
        item.sets ?? 0,
        item.reps ?? '',
        item.weight ?? undefined
      );
    } else if (sessao.momento === 'execucao' && deOnde === 'descanso' && proxima) {
      coach.announceSetStart(
        proxima.numero,
        proxima.item.reps ?? '',
        proxima.item.weight ?? undefined
      );
    } else if (sessao.momento === 'resumo' && deOnde !== 'resumo') {
      coach.announceFinish();
    }
  }, [sessao, coachRef]);
}

function useMicrofone(
  sessao: EstadoDaSessao,
  despachar: (acao: AcaoDaSessao) => void,
  pedirParaFinalizar: () => void,
  coachRef: CoachRef
): Pick<VozDaSessao, 'ouvindo' | 'alternarMicrofone'> {
  const [desligado, setDesligado] = useState(false);
  const correndo = emAndamento(sessao.momento);

  // "Pausar" e "retomar" falam do cronômetro que estiver na tela: o da série ou
  // o do descanso.
  const momento = sessao.momento;
  const alternar = useCallback(
    (agora: number) =>
      despachar({ tipo: momento === 'serie' ? 'alternarSerie' : 'alternarDescanso', agora }),
    [momento, despachar]
  );

  const aoComando = useCallback(
    (acao: VoiceAction) => {
      const agora = Date.now();
      if (acao === 'next_set') despachar({ tipo: 'concluirSerie', agora });
      else if (acao === 'finish_workout') pedirParaFinalizar();
      else if (acao === 'pause_timer' || acao === 'resume_timer') alternar(agora);
      else if (acao === 'repeat_instruction') coachRef.current.repeatLastInstruction();
    },
    [despachar, pedirParaFinalizar, coachRef, alternar]
  );

  const { isRecording, startListening, stopListening } = useVoiceInput({
    onCommand: aoComando,
    continuous: true,
  });

  useEffect(() => {
    if (correndo && !desligado) startListening();
    else stopListening();
    return () => {
      stopListening();
    };
  }, [correndo, desligado, startListening, stopListening]);

  return { ouvindo: isRecording, alternarMicrofone: () => setDesligado((d) => !d) };
}
