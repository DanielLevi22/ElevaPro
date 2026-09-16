import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Vidro } from '@/components/ui/Vidro';

/**
 * A análise pedida não está na lista: foi apagada em outra tela, ou o link é
 * de outra conta — a RLS não devolve a linha, e a tela não diz qual dos dois.
 *
 * @example if (!scan) return <ScanMissing />;
 */
export function ScanMissing() {
  const router = useRouter();
  return (
    <GlassScreen glow={PROGRESS_GLOW}>
      <View className="pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>
      <Vidro classeExterna="mt-6" className="p-4">
        <Text className="text-[0.9375rem] font-bold text-foreground">Análise não encontrada</Text>
        <Text className="mt-1.5 text-[0.8125rem] leading-[1.22rem] text-muted-foreground">
          Ela pode ter sido apagada. As outras continuam no histórico de scans.
        </Text>
      </Vidro>
    </GlassScreen>
  );
}
