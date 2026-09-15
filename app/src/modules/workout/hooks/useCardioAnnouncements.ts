import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';
import { estimateCalories } from '../services/cardioMetrics';
import { type CardioSessionState, elapsedMs } from '../store/cardioSessionMachine';

/** Um aviso de voz a cada cinco minutos, como a tela antiga fazia. */
const ANNOUNCE_EVERY_MS = 5 * 60_000;

interface AnnouncementInput {
  session: CardioSessionState;
  now: number;
  met: number;
  weightKg: number;
}

/**
 * A vibração e a voz da sessão ao vivo: a meta batida, uma vez, e o tempo e o
 * gasto a cada cinco minutos.
 *
 * A meta vem da máquina (`goalReachedAt`), que a marca uma vez só: o aviso não
 * repete a cada tique e não se perde quando o app volta do background depois do
 * minuto exato.
 *
 * @example useCardioAnnouncements({ session, now, met: modality.met, weightKg });
 */
export function useCardioAnnouncements({ session, now, met, weightKg }: AnnouncementInput): void {
  const { goalReachedAt, goalMinutes, moment } = session;

  useEffect(() => {
    if (goalReachedAt === null || goalMinutes === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Speech.speak(`Parabéns! Você atingiu sua meta de ${goalMinutes} minutos.`, {
      language: 'pt-BR',
    });
  }, [goalReachedAt, goalMinutes]);

  // Guarda o último múltiplo anunciado, e não soma a partir de agora: voltar do
  // background depois de meia hora dispararia seis avisos seguidos.
  const lastAnnounced = useRef(0);
  const elapsed = elapsedMs(session, now);
  const block = Math.floor(elapsed / ANNOUNCE_EVERY_MS) * ANNOUNCE_EVERY_MS;

  useEffect(() => {
    if (moment !== 'live' || block === 0 || block <= lastAnnounced.current) return;
    lastAnnounced.current = block;
    // Meta de 30 min cai no aviso dos 30: os parabéns já falaram por ele.
    if (goalMinutes !== null && goalMinutes * 60_000 === block) return;
    const minutes = block / 60_000;
    const calories = estimateCalories(met, weightKg, block);
    Speech.speak(
      `Você já treinou ${minutes} minutos e gastou ${calories} calorias. Continue assim!`,
      { language: 'pt-BR' }
    );
  }, [moment, block, goalMinutes, met, weightKg]);
}
