import type { ZoneShare } from '@elevapro/shared';
import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';

/**
 * "Zonas de esforço" do resumo: a barra do tempo em cada zona e a legenda.
 *
 * O kit desenha quatro zonas; a régua do app tem cinco (`heartRateZones`). Da Z1
 * à Z3 as cores são as do kit; a Z4 fica âmbar e a Z5 ganha o vermelho do
 * batimento, que o kit dá à zona mais alta. Zona vazia some da barra, mas fica na
 * legenda com 0%: sumir da legenda esconderia que ela existe.
 *
 * @example <HeartRateZones zones={{ zone1: 12, zone2: 38, zone3: 34, zone4: 16, zone5: 0 }} />
 */
const ZONES = [
  { key: 'zone1', label: 'Z1 Leve', swatch: 'bg-placeholder' },
  { key: 'zone2', label: 'Z2 Moderada', swatch: 'bg-metrica-ritmo' },
  { key: 'zone3', label: 'Z3 Aeróbica', swatch: 'bg-primary' },
  { key: 'zone4', label: 'Z4 Limiar', swatch: 'bg-warning' },
  { key: 'zone5', label: 'Z5 Máxima', swatch: 'bg-metrica-batimento' },
] as const satisfies readonly { key: keyof ZoneShare; label: string; swatch: string }[];

export function HeartRateZones({ zones }: { zones: ZoneShare }) {
  return (
    <Vidro className="p-[0.9375rem]">
      <View className="h-3 flex-row gap-0.5 overflow-hidden rounded-full">
        {ZONES.filter(({ key }) => zones[key] > 0).map(({ key, swatch }) => (
          <View key={key} className={swatch} style={{ flex: zones[key] }} />
        ))}
      </View>
      <View className="mt-3 gap-2">
        {ZONES.map(({ key, label, swatch }) => (
          <View key={key} className="flex-row items-center gap-[0.5625rem]">
            <View
              className={cn('h-[0.5625rem] w-[0.5625rem] shrink-0 rounded-[0.1875rem]', swatch)}
            />
            <Text className="flex-1 text-[0.78125rem] text-muted-foreground">{label}</Text>
            <Text className="text-[0.78125rem] font-bold text-foreground">{zones[key]}%</Text>
          </View>
        ))}
      </View>
    </Vidro>
  );
}
