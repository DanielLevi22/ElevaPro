import { Accelerometer } from 'expo-sensors';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';

export type IntensityLevel = 'Baixa' | 'Moderada' | 'Alta';

/** 1,0 g é o aparelho parado, só com a gravidade. */
const HIGH_G = 1.8;
const MODERATE_G = 1.2;

/**
 * Faixa morta entre as faixas. Sem ela, uma corrida que oscila em torno de 1,8 g
 * — que é o normal, porque cada passada é um pico — atravessa o limiar a cada
 * amostra e o app fala sem parar.
 */
const HYSTERESIS = 0.15;

/** As barras do kit: as dezesseis leituras mais recentes, uma por segundo. */
export const INTENSITY_SAMPLES = 16;

function classify(magnitude: number, current: IntensityLevel): IntensityLevel {
  // Para SAIR de uma faixa é preciso passar do limiar mais a histerese; para
  // entrar, o limiar puro. É o que transforma oscilação em transição.
  const high = current === 'Alta' ? HIGH_G - HYSTERESIS : HIGH_G;
  const moderate = current === 'Baixa' ? MODERATE_G : MODERATE_G - HYSTERESIS;
  if (magnitude > high) return 'Alta';
  if (magnitude > moderate) return 'Moderada';
  return 'Baixa';
}

export interface MovementIntensity {
  level: IntensityLevel;
  /** Magnitudes em g, da mais antiga para a mais recente. Só em memória. */
  samples: number[];
}

/**
 * Intensidade estimada pelo acelerômetro, para exibição ao vivo: a faixa atual e
 * as últimas leituras, que desenham as barras do mostrador.
 *
 * **Não é o que vai para o banco.** O `intensity` de `workout_sessions` é o RPE
 * que o aluno responde no fim da sessão — escala de esforço percebido, execução
 * de contrato. Confundir os dois faria uma leitura de sensor virar declaração
 * do titular. As amostras morrem com a tela.
 *
 * @example
 * const { level, samples } = useMovementIntensity(session.moment === 'live');
 */
export function useMovementIntensity(active: boolean): MovementIntensity {
  const [intensity, setIntensity] = useState<MovementIntensity>({ level: 'Baixa', samples: [] });
  // O ref guarda a faixa corrente para o listener sem entrar nas dependências
  // do efeito — lê-la do estado obrigaria a reinscrever o acelerômetro a cada
  // mudança de faixa.
  const levelRef = useRef<IntensityLevel>('Baixa');

  useEffect(() => {
    if (!active) return;

    Accelerometer.setUpdateInterval(1000);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const level = classify(magnitude, levelRef.current);
      const changed = level !== levelRef.current;
      levelRef.current = level;
      setIntensity((previous) => ({
        level,
        samples: [...previous.samples, magnitude].slice(-INTENSITY_SAMPLES),
      }));
      // Fora do atualizador de estado: o React pode reexecutá-lo, e falar de
      // dentro dele faria o aparelho repetir o anúncio sem que nada mudasse.
      if (changed) Speech.speak(`Intensidade ${level}`, { language: 'pt-BR' });
    });

    return () => subscription.remove();
  }, [active]);

  return intensity;
}

/**
 * A altura da barra, de 0 a 1: parado fica baixo, e 2,2 g enchem a barra.
 *
 * @example barHeight(1.8) // ≈ 0,71
 */
export function barHeight(magnitude: number): number {
  const MIN = 0.2;
  const fraction = (magnitude - 0.8) / (2.2 - 0.8);
  return Math.max(MIN, Math.min(1, fraction));
}

/** A barra acende na primária quando a leitura está na faixa alta. */
export function isHighSample(magnitude: number): boolean {
  return magnitude > HIGH_G;
}
