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
  /**
   * Aviso curto sobre a origem do número, ao lado do ícone — "Simulado".
   *
   * Existe porque o bloco mostra o número grande e sem contexto: sem o selo, o
   * dado de mentira que o app usa sem relógio conectado lia como leitura real.
   */
  selo?: string;
}

export function BlocoDeMetrica({ icon, tom, valor, unidade, legenda, selo }: BlocoDeMetricaProps) {
  return (
    <Vidro classeExterna="flex-1" className="p-3.5">
      <View className="mb-3 flex-row items-start justify-between">
        <CaixaDeIcone icon={icon} tom={tom} tamanho="bloco" />
        {selo ? (
          <Text className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-warning">
            {selo}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-baseline gap-[0.1875rem]">
        <Text className="font-display-black text-h2 tracking-tight text-foreground">{valor}</Text>
        {unidade ? (
          <Text className="text-[0.6875rem] font-semibold text-muted-foreground">{unidade}</Text>
        ) : null}
      </View>
      {/*
        Uma linha só, no 11,5 do kit. Com a legenda maior, "Queimadas hoje"
        quebrava em duas e "Sono" em uma — e os três blocos ficavam de alturas
        diferentes lado a lado.
      */}
      <Text numberOfLines={1} className="mt-0.5 text-[0.71875rem] text-muted-foreground">
        {legenda}
      </Text>
    </Vidro>
  );
}

export type { BlocoDeMetricaProps };
