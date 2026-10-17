import { createMMKV } from 'react-native-mmkv';
import type { TodaySnapshot } from './todaySnapshot';

const storage = createMMKV({ id: 'today-widget' });
const KEY = 'snapshot';

/**
 * O último retrato do dia, para o widget redesenhar sem rede nem sessão: o
 * Android acorda o widget com o app fechado. Só nomes e horários do plano.
 *
 * @example const retrato = readTodaySnapshot();
 */
export function readTodaySnapshot(): TodaySnapshot | null {
  const raw = storage.getString(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TodaySnapshot;
  } catch {
    return null;
  }
}

/** @example saveTodaySnapshot(retrato); */
export function saveTodaySnapshot(snapshot: TodaySnapshot): void {
  storage.set(KEY, JSON.stringify(snapshot));
}

/** Ao sair da conta, o widget não pode seguir mostrando o dia de quem saiu. */
export function clearTodaySnapshot(): void {
  storage.remove(KEY);
}
