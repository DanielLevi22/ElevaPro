import { Text, View } from 'react-native';
import { BarraDeProgresso } from './BarraDeProgresso';
import { Vidro } from './Vidro';

interface PrecisionMeterProps {
  percent: number;
  /** "Baixa", "Média", "Alta": quem chama decide o corte, a barra só mostra. */
  level: string;
}

/**
 * A precisão do plano no kit (`Precisao` no desenho): quanto do plano sai das
 * respostas da pessoa, e não de padrão. Sobe enquanto ela responde.
 *
 * @example <PrecisionMeter percent={83} level="Alta" />
 */
export function PrecisionMeter({ percent, level }: PrecisionMeterProps) {
  return (
    <Vidro className="px-3.5 py-3">
      <View
        className="mb-[0.5625rem] flex-row items-center justify-between"
        accessibilityLabel={`Precisão do plano: ${level}, ${percent}%`}
      >
        <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
          Precisão do plano
        </Text>
        <Text className="text-xs font-bold text-hero">{`${level} · ${percent}%`}</Text>
      </View>
      <BarraDeProgresso percentual={percent} />
    </Vidro>
  );
}

export type { PrecisionMeterProps };
