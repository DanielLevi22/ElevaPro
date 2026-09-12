import type { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { CaixaDeIcone, type TomDeMetrica } from './CaixaDeIcone';
import { Vidro } from './Vidro';

/**
 * Bloco de métrica em vidro: ícone tingido, número grande, unidade e legenda.
 *
 * É o que o kit põe em fila na tela inicial — passos, calorias, sono. O número
 * e a unidade ficam na mesma linha de base, para "8.412 passos" ler como uma
 * coisa e não duas.
 *
 * @example
 * <BlocoDeMetrica icon="footsteps" tom="passos" valor="8.412" unidade="passos"
 *   legenda="84% da meta" />
 */
interface BlocoDeMetricaProps {
  icon: keyof typeof Ionicons.glyphMap;
  tom: TomDeMetrica;
  valor: string;
  /** Some quando a grandeza já está no valor, como "7h20" de sono. */
  unidade?: string;
  legenda: string;
}

export function BlocoDeMetrica({ icon, tom, valor, unidade, legenda }: BlocoDeMetricaProps) {
  return (
    <Vidro className="flex-1 p-3.5">
      <View className="mb-3">
        <CaixaDeIcone icon={icon} tom={tom} tamanho="bloco" />
      </View>

      <View className="flex-row items-baseline gap-[0.1875rem]">
        <Text className="font-display-black text-h2 tracking-tight text-foreground">{valor}</Text>
        {unidade ? (
          <Text className="text-micro font-semibold text-muted-foreground">{unidade}</Text>
        ) : null}
      </View>
      <Text className="mt-0.5 text-micro text-muted-foreground">{legenda}</Text>
    </Vidro>
  );
}

export type { BlocoDeMetricaProps };
