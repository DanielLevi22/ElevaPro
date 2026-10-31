import { Text, View } from 'react-native';
import { type PreferenciaDeTema, useTemaStore } from '@/shared/design';
import { CaixaDeIcone } from './CaixaDeIcone';
import { GlassSegmented } from './GlassSegmented';
import { Vidro } from './Vidro';

const OPTIONS: readonly { value: PreferenciaDeTema; label: string }[] = [
  { value: 'sistema', label: 'Sistema' },
  { value: 'claro', label: 'Claro' },
  { value: 'escuro', label: 'Escuro' },
];

/**
 * A escolha de tema no kit de vidro: um cartão com o segmentado. Mora no
 * perfil desde a #376; antes era uma lista chapada num menu que ninguém
 * alcançava (#281).
 *
 * @example <ThemePicker />
 */
export function ThemePicker() {
  const { preferencia, escolher } = useTemaStore();
  return (
    <Vidro classeExterna="mb-2.5" className="gap-3 p-3.5">
      <View className="flex-row items-center gap-[0.8125rem]">
        <CaixaDeIcone icon="contrast-outline" tom="sono" tamanho="linha" />
        <View className="flex-1">
          <Text className="text-rotulo font-semibold tracking-tight text-foreground">
            Aparência
          </Text>
          <Text className="mt-px text-micro text-muted-foreground">
            A escolha vale só neste aparelho
          </Text>
        </View>
      </View>
      <GlassSegmented options={OPTIONS} value={preferencia} onChange={escolher} />
    </Vidro>
  );
}
