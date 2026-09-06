import { Accelerometer } from 'expo-sensors';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import type { IntensidadePercebida } from '../components/CabecalhoDaSessao';

/** 1,0 g é o aparelho parado, só com a gravidade. */
const LIMIAR_ALTA = 1.8;
const LIMIAR_MODERADA = 1.2;

/**
 * Faixa morta entre as faixas. Sem ela, uma corrida que oscila em torno de 1,8 g
 * — que é o normal, porque cada passada é um pico — atravessa o limiar a cada
 * amostra e o app fala sem parar.
 */
const HISTERESE = 0.15;

function classificar(magnitude: number, atual: IntensidadePercebida): IntensidadePercebida {
  // Para SAIR de uma faixa é preciso passar do limiar mais a histerese; para
  // entrar, o limiar puro. É o que transforma oscilação em transição.
  const alta = atual === 'Alta' ? LIMIAR_ALTA - HISTERESE : LIMIAR_ALTA;
  const moderada = atual === 'Baixa' ? LIMIAR_MODERADA : LIMIAR_MODERADA - HISTERESE;

  if (magnitude > alta) return 'Alta';
  if (magnitude > moderada) return 'Moderada';
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
  // O ref guarda o valor corrente para o listener sem entrar nas dependências
  // do efeito — lê-lo do estado obrigaria a reinscrever o acelerômetro a cada
  // mudança de faixa.
  const atualRef = useRef<IntensidadePercebida>('Baixa');

  useEffect(() => {
    if (!ativo) return;

    Accelerometer.setUpdateInterval(1000);
    const inscricao = Accelerometer.addListener(({ x, y, z }) => {
      const nova = classificar(Math.sqrt(x * x + y * y + z * z), atualRef.current);
      if (nova === atualRef.current) return;

      atualRef.current = nova;
      setIntensidade(nova);
      // Fora do atualizador de estado: o React pode reexecutá-lo, e falar de
      // dentro dele faria o aparelho repetir o anúncio sem que nada mudasse.
      Speech.speak(`Intensidade ${nova}`, { language: 'pt-BR' });
    });

    return () => inscricao.remove();
  }, [ativo]);

  return intensidade;
}
