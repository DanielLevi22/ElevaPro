import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { Vidro } from '@/components/ui/Vidro';
import { WaitStep, type WaitStepState } from '@/components/ui/WaitStep';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { mensagemDeErroBff } from '@/shared/bff';
import { useNextBlockActions } from '../hooks/useBlockReview';
import { useReviewStore } from '../store/reviewStore';

const STEPS = [
  'Lendo como foi o bloco',
  'Revendo suas cargas',
  'Montando os treinos',
  'Conferindo sua meta',
] as const;
/** O passo da tela avança no tempo da geração, que leva uns segundos. */
const STEP_MS = 4000;

/**
 * B3 · Montando o próximo bloco. Pede ao BFF uma vez ao abrir; os passos
 * acompanham a espera, e o último fica "agora" até a resposta chegar.
 *
 * @example <BuildingScreen />
 */
export function BuildingScreen() {
  const router = useRouter();
  const changes = useReviewStore((state) => state.changes);
  const { build } = useNextBlockActions();
  const step = useStepClock(build.isPending);
  const asked = useRef(false);

  // Uma vez por abertura: o efeito roda de novo em modo estrito, e cada pedido
  // é uma geração de IA paga.
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    build.mutate(changes, {
      onSuccess: () => router.replace(ROUTES.BLOCK.REPORT),
      onError: () => registrarFalha('block.build_next'),
    });
  }, [build, changes, router]);

  const failed = build.isError;
  return (
    <FlowFrame
      header={failed ? {} : undefined}
      primary={
        failed
          ? { label: 'Tentar de novo', icon: 'refresh', onPress: () => build.mutate(changes) }
          : undefined
      }
    >
      <FlowTitle
        eyebrow="Leva uns segundos"
        sub={failed ? mensagemDeErroBff(build.error) : 'A partir do que você levanta hoje.'}
      >
        Montando seu próximo bloco
      </FlowTitle>
      <Vidro classeExterna="mt-5" className="px-3.5">
        {STEPS.map((label, index) => (
          <WaitStep key={label} label={label} state={stateOf(index, step, failed)} />
        ))}
      </Vidro>
    </FlowFrame>
  );
}

function stateOf(index: number, current: number, failed: boolean): WaitStepState {
  if (index < current) return 'done';
  if (index === current) return failed ? 'stopped' : 'current';
  return 'next';
}

/** O passo da vez, que anda enquanto espera e para no último. */
function useStepClock(running: boolean): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setStep((value) => Math.min(value + 1, STEPS.length - 1)),
      STEP_MS
    );
    return () => clearInterval(timer);
  }, [running]);
  return step;
}
