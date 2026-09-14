import { Platform } from 'react-native';
import { healthConnectPlatform } from './healthConnect';
import { healthKitPlatform } from './healthKit';
import type { WearablePlatform } from './platform';

/**
 * A plataforma de saúde deste aparelho, ou `null` fora de iOS e Android. É o único
 * lugar que olha `Platform.OS`, e decide na chamada: o teste troca a plataforma.
 *
 * @example
 * const platform = currentPlatform();
 * if (platform) await platform.readToday();
 */
export function currentPlatform(): WearablePlatform | null {
  if (Platform.OS === 'ios') return healthKitPlatform;
  if (Platform.OS === 'android') return healthConnectPlatform;
  return null;
}
