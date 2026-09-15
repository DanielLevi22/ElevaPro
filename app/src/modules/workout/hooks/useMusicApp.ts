import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

/**
 * O app de música do aparelho, para o botão da sessão ao vivo.
 *
 * O app não toca música: abre o player que a pessoa já usa. No iOS é o Música;
 * no Android não há endereço comum a todos os players, então tenta os mais
 * usados. Sem nenhum que abra, o botão some — melhor que um botão que não faz
 * nada.
 *
 * @example const openMusic = useMusicApp(); // null quando não há player
 */
const MUSIC_URLS = Platform.select({
  ios: ['music://', 'spotify:'],
  default: ['spotify:', 'youtubemusic://'],
});

export function useMusicApp(): (() => void) | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const candidate of MUSIC_URLS) {
        if (await Linking.canOpenURL(candidate).catch(() => false)) {
          if (!cancelled) setUrl(candidate);
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return url === null ? null : () => void Linking.openURL(url).catch(() => undefined);
}
