import { Text, View } from 'react-native';
import { BarraDeProgresso } from './BarraDeProgresso';
import { Vidro } from './Vidro';

interface PrecisaoProps {
  percentual: number;
  /** "Baixa", "Média", "Alta": quem chama decide o corte, a barra só mostra. */
  nivel: string;
}

/**
 * A precisão do plano no kit (`Precisao`): quanto do plano sai das respostas da
 * pessoa, e não de padrão. Sobe enquanto ela responde.
 *
 * @example <Precisao percentual={83} nivel="Alta" />
 */
export function Precisao({ percentual, nivel }: PrecisaoProps) {
  return (
    <Vidro className="px-3.5 py-3">
      <View
        className="mb-[0.5625rem] flex-row items-center justify-between"
        accessibilityLabel={`Precisão do plano: ${nivel}, ${percentual}%`}
      >
        <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-placeholder">
          Precisão do plano
        </Text>
        <Text className="text-xs font-bold text-hero">{`${nivel} · ${percentual}%`}</Text>
      </View>
      <BarraDeProgresso percentual={percentual} />
    </Vidro>
  );
}

export type { PrecisaoProps };
