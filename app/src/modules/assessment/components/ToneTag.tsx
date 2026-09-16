import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';
import type { Tone } from '../services/scanView';
import { TONE_STYLE } from './toneStyle';

/**
 * A etiqueta de tom do kit de body scan: "Tudo certo", "Atenção", "Captura
 * confiável". Caixa alta, 9,5 / 800, fundo da cor a 15%.
 *
 * @example <ToneTag tone="attention">Atenção</ToneTag>
 */
export function ToneTag({ tone, children }: { tone: Tone; children: string }) {
  return (
    <View
      className={cn(
        'shrink-0 self-start rounded-full px-2 py-[0.1875rem]',
        TONE_STYLE[tone].tagFill
      )}
    >
      <Text
        className={cn(
          'text-[0.59375rem] font-extrabold uppercase tracking-wide',
          TONE_STYLE[tone].text
        )}
      >
        {children}
      </Text>
    </View>
  );
}
