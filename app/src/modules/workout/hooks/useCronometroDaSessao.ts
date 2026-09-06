import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const AVISO_A_CADA_SEGUNDOS = 300;

interface CronometroDaSessao {
  segundos: number;
  calorias: number;
  emAndamento: boolean;
  /** Instante do primeiro início. Nulo enquanto a sessão não começou. */
  inicioDaSessao: Date | null;
  iniciar: () => void;
  pausar: () => void;
}

interface CronometroOptions {
  met: number;
  pesoKg: number;
  metaEmMinutos: number | null;
}

/**
 * Conta o tempo da sessão pelo relógio do sistema, e não por acumulação de
 * tiques.
 *
 * A diferença importa: um `setInterval` que soma 1 a cada disparo perde tempo
 * sempre que o sistema suspende o app, e a corrida de uma hora vira quarenta
 * minutos. Aqui o tique só relê `Date.now()`, então voltar do background já
 * chega com o número certo.
 *
 * @example
 * const { segundos, calorias, iniciar, pausar } = useCronometroDaSessao({
 *   met: 8,
 *   pesoKg: 74,
 *   metaEmMinutos: 45,
 * });
 */
export function useCronometroDaSessao({
  met,
  pesoKg,
  metaEmMinutos,
}: CronometroOptions): CronometroDaSessao {
  const [segundos, setSegundos] = useState(0);
  const [emAndamento, setEmAndamento] = useState(false);
  const [inicioDaSessao, setInicioDaSessao] = useState<Date | null>(null);

  const iniciadoEm = useRef<number | null>(null);
  const acumulado = useRef(0);
  const ultimoAviso = useRef(0);

  const calorias = (segundos * (met * pesoKg)) / 3600;

  const decorridos = useCallback(() => {
    if (iniciadoEm.current === null) return acumulado.current;
    return acumulado.current + Math.floor((Date.now() - iniciadoEm.current) / 1000);
  }, []);

  const iniciar = useCallback(() => {
    iniciadoEm.current = Date.now();
    setEmAndamento(true);
    // Só o primeiro início marca o começo da sessão: retomar depois de uma
    // pausa não pode reescrever `started_at`, que é o que o histórico guarda.
    setInicioDaSessao((atual) => atual ?? new Date());
  }, []);

  const pausar = useCallback(() => {
    acumulado.current = decorridos();
    iniciadoEm.current = null;
    setEmAndamento(false);
    setSegundos(acumulado.current);
  }, [decorridos]);

  useEffect(() => {
    if (!emAndamento) return;

    const tique = setInterval(() => setSegundos(decorridos()), 1000);
    return () => clearInterval(tique);
  }, [emAndamento, decorridos]);

  // Voltar do background acerta o relógio na hora, sem esperar o próximo tique.
  useEffect(() => {
    const inscricao = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && emAndamento) setSegundos(decorridos());
    });
    return () => inscricao.remove();
  }, [emAndamento, decorridos]);

  // Avisos de voz. Em efeito próprio, e dependendo só de `segundos`, para não
  // acoplar a fala ao tique — que roda mesmo com a tela apagada.
  useEffect(() => {
    if (segundos === 0) return;

    if (metaEmMinutos !== null && segundos === metaEmMinutos * 60) {
      Speech.speak(`Parabéns! Você atingiu sua meta de ${metaEmMinutos} minutos.`, {
        language: 'pt-BR',
      });
      return;
    }

    if (segundos < ultimoAviso.current + AVISO_A_CADA_SEGUNDOS) return;

    const minutos = Math.floor(segundos / 60);
    const gastas = Math.round((segundos * (met * pesoKg)) / 3600);
    Speech.speak(
      `Você já treinou ${minutos} minutos e gastou ${gastas} calorias. Continue assim!`,
      {
        language: 'pt-BR',
      }
    );

    // Alinha ao múltiplo de cinco minutos em vez de somar a partir de agora:
    // sem isso, voltar do background depois de meia hora dispararia seis avisos
    // seguidos.
    ultimoAviso.current = Math.floor(segundos / AVISO_A_CADA_SEGUNDOS) * AVISO_A_CADA_SEGUNDOS;
  }, [segundos, metaEmMinutos, met, pesoKg]);

  return { segundos, calorias, emAndamento, inicioDaSessao, iniciar, pausar };
}
