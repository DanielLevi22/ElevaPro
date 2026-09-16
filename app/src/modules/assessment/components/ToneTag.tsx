import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';
import type { Tone } from '../services/scanView';

/**
 * A etiqueta de tom do kit de body scan: "Tudo certo", "Atenção", "Captura
 * confiável". Caixa alta, 9,5 / 800, fundo da cor a 15%.
 *
 * O tom é nome, e não cor: classe do Tailwind só existe se aparecer literal no
 * fonte. A tela antiga montava `bg-${cor}-500/10` e a etiqueta saía sem fundo.
 *
 * @example <ToneTag tone="attention">Atenção</ToneTag>
 */
export const TONE_FILL: Record<Tone, string> = {
  ok: 'bg-metrica-passos/15',
  attention: 'bg-metrica-gordura/15',
  bad: 'bg-metrica-batimento/15',
  neutral: 'bg-glass-strong',
};

export const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-texto-saude-passos',
  attention: 'text-texto-macro-gordura',
  bad: 'text-texto-cardio-batimento',
  neutral: 'text-muted-foreground',
};

export function ToneTag({ tone, children }: { tone: Tone; children: string }) {
  return (
    <View className={cn('shrink-0 self-start rounded-full px-2 py-[0.1875rem]', TONE_FILL[tone])}>
      <Text
        className={cn('text-[0.59375rem] font-extrabold uppercase tracking-wide', TONE_TEXT[tone])}
      >
        {children}
      </Text>
    </View>
  );
}
