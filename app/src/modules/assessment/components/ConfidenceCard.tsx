import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import type { ConfiancaDoScan, NivelDeConfianca } from '../services/confiancaDoScan';
import { CONFIDENCE_TAG } from '../services/scanView';
import { TONE_STYLE } from './toneStyle';

/**
 * O quanto confiar nos números desta análise, antes de lê-los (tela 6 do kit).
 *
 *     raio 22, padding 16; fundo da cor a 12%, borda a 38%; título 15 / 700
 *     motivos abaixo de um fio na cor a 28%
 *
 * Vem **antes** das notas de propósito: saber que a foto saiu contra a luz muda
 * como se lê a tela inteira, e ressalva lida depois do número chegou tarde.
 *
 * @example <ConfidenceCard confidence={avaliarConfianca(entrada)} />
 */
const ICON: Record<NivelDeConfianca, keyof typeof Ionicons.glyphMap> = {
  alta: 'checkmark-circle-outline',
  media: 'warning-outline',
  baixa: 'alert-circle-outline',
};

export function ConfidenceCard({ confidence }: { confidence: ConfiancaDoScan }) {
  const cores = useCores();
  const escalar = useEscala();
  const level = confidence.nivel;
  const tone = TONE_STYLE[CONFIDENCE_TAG[level].tone];
  return (
    <View className={cn('mt-4 rounded-[1.375rem] border p-4', tone.box)}>
      <View className="flex-row items-center gap-[0.5625rem]">
        <Ionicons name={ICON[level]} size={escalar(19)} color={tone.icon(cores)} />
        <Text className="text-[0.9375rem] font-bold text-foreground">
          {CONFIDENCE_TAG[level].label}
        </Text>
      </View>
      <Text className="mt-[0.5625rem] text-[0.8125rem] leading-[1.22rem] text-muted-foreground">
        {confidence.resumo}
      </Text>
      {confidence.motivos.length > 0 ? (
        <View className={cn('mt-3 gap-[0.5625rem] border-t pt-3', tone.rule)}>
          {confidence.motivos.map((reason) => (
            <View key={reason} className="flex-row items-start gap-2.5">
              <View
                className={cn('mt-[0.4375rem] h-[0.3125rem] w-[0.3125rem] rounded-full', tone.dot)}
              />
              <Text className="flex-1 text-[0.78125rem] leading-[1.2rem] text-muted-foreground">
                {reason}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
