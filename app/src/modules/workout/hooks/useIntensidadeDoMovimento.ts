import { Accelerometer } from 'expo-sensors';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import type { IntensidadePercebida } from '../components/CabecalhoDaSessao';

/** 1,0 g é o aparelho parado, só com a gravidade. */
const LIMIAR_ALTA = 1.8;
const LIMIAR_MODERADA = 1.2;

function classificar(magnitude: number): IntensidadePercebida {
  if (magnitude > LIMIAR_ALTA) return 'Alta';
  if (magnitude > LIMIAR_MODERADA) return 'Moderada';
  return 'Baixa';
}

/**
 * Intensidade estimada pelo acelerômetro, para exibição ao vivo.
 *
 * **Não é o que vai para o banco.** O `intensity` de `workout_sessions` é o RPE
 * que o aluno responde no fim da sessão — escala de esforço percebido, execução
 * de contrato. Confundir os dois faria uma leitura de sensor virar declaração
 * do titular.
 *
 * @example
 * const intensidade = useIntensidadeDoMovimento(emAndamento);
 */
export function useIntensidadeDoMovimento(ativo: boolean): IntensidadePercebida {
  const [intensidade, setIntensidade] = useState<IntensidadePercebida>('Baixa');

  useEffect(() => {
    if (!ativo) return;

    Accelerometer.setUpdateInterval(1000);
    const inscricao = Accelerometer.addListener(({ x, y, z }) => {
      const nova = classificar(Math.sqrt(x * x + y * y + z * z));

      // Funcional: a fala depende do valor anterior, e lê-lo de fora obrigaria
      // a reinscrever o acelerômetro a cada mudança de intensidade.
      setIntensidade((atual) => {
        if (nova === atual) return atual;
        Speech.speak(`Intensidade ${nova}`, { language: 'pt-BR' });
        return nova;
      });
    });

    return () => inscricao.remove();
  }, [ativo]);

  return intensidade;
}
