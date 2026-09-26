import type { ActivityKind } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { CaixaDeIcone, type TomDeMetrica } from '@/components/ui/CaixaDeIcone';
import { Vidro } from '@/components/ui/Vidro';
import type { TimelineEntry } from '../services/followUp';

/**
 * Um evento da linha do tempo do acompanhamento: ícone tingido pelo tipo,
 * quando, o quê e a linha de detalhe.
 *
 * @example <TimelineCard entry={entry} />
 */
const ICON_BY_KIND: Record<ActivityKind, keyof typeof Ionicons.glyphMap> = {
  workout: 'checkmark-circle-outline',
  cardio: 'heart-outline',
  meal: 'nutrition-outline',
  diet_plan: 'restaurant-outline',
  assessment: 'body-outline',
  body_scan: 'scan-outline',
  anamnesis: 'document-text-outline',
};

/** O verde do kit para o que o aluno cumpriu, o azul para a dieta, a marca para a medida. */
const TONE_BY_KIND: Record<ActivityKind, TomDeMetrica> = {
  workout: 'passos',
  cardio: 'batimento',
  meal: 'ritmo',
  diet_plan: 'ritmo',
  assessment: 'marca',
  body_scan: 'cadencia',
  anamnesis: 'gordura',
};

export function TimelineCard({ entry }: { entry: TimelineEntry }) {
  return (
    <Vidro classeExterna="mb-[0.5625rem]" className="flex-row items-center gap-3 p-[0.8125rem]">
      <CaixaDeIcone icon={ICON_BY_KIND[entry.kind]} tom={TONE_BY_KIND[entry.kind]} />
      <View className="min-w-0 flex-1">
        <Text className="text-[0.59375rem] font-extrabold uppercase tracking-widest text-placeholder">
          {entry.when}
        </Text>
        <Text className="mt-0.5 text-[0.84375rem] font-bold text-foreground">{entry.title}</Text>
        {entry.detail ? (
          <Text className="mt-px text-[0.71875rem] leading-[1.35] text-muted-foreground">
            {entry.detail}
          </Text>
        ) : null}
      </View>
    </Vidro>
  );
}
