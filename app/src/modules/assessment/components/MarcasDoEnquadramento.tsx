import { View } from 'react-native';
import type { Proximidade } from '../services/portao';

/**
 * As marcas do Enquadramento.
 *
 * Um retângulo só. Havia também uma borda em volta da tela inteira, para o
 * estado atravessar três metros — mas duas molduras concorrem entre si e a de
 * fora não marcava nada. O alvo ficou grosso e saturado no lugar dela: cor
 * cheia atravessa a distância tão bem quanto área, e ainda diz **onde** ficar.
 *
 * A altura é fixa: é ela que governa a distância e faz dois scans serem
 * comparáveis (`ADR-0010`). E o corpo precisa caber aqui dentro — um retângulo
 * que não precisa ser respeitado é um retângulo que mente.
 */

/** Saturadas de propósito — a três metros, tom pastel some. */
const CORES: Record<Proximidade, string> = {
  longe: '#FF1744',
  quase: '#FFD600',
  pronto: '#00E676',
};

/** Largura do alvo, em fração da tela. Cabe corpo largo sem encostar nas bordas. */
const LARGURA_ALVO = 0.62;

interface MarcasDoEnquadramentoProps {
  /** Onde a faixa começa e termina, em fração da altura da tela. */
  topo: number;
  base: number;
  proximidade: Proximidade;
}

export function MarcasDoEnquadramento({ topo, base, proximidade }: MarcasDoEnquadramentoProps) {
  const cor = CORES[proximidade];
  const margem = `${((1 - LARGURA_ALVO) / 2) * 100}%`;

  return (
    <>
      {/* Cantos reforçados: dão a forma do retângulo sem fechar a imagem com
          moldura pesada, que atrapalharia enxergar o próprio corpo. */}
      <View
        pointerEvents="none"
        className="absolute"
        style={{
          top: `${topo * 100}%`,
          height: `${(base - topo) * 100}%`,
          left: margem,
          right: margem,
          borderWidth: 5,
          borderColor: cor,
          borderRadius: 4,
        }}
      >
        <Canto cor={cor} estilo={{ top: -3, left: -3, borderTopWidth: 8, borderLeftWidth: 8 }} />
        <Canto cor={cor} estilo={{ top: -3, right: -3, borderTopWidth: 8, borderRightWidth: 8 }} />
        <Canto
          cor={cor}
          estilo={{ bottom: -3, left: -3, borderBottomWidth: 8, borderLeftWidth: 8 }}
        />
        <Canto
          cor={cor}
          estilo={{ bottom: -3, right: -3, borderBottomWidth: 8, borderRightWidth: 8 }}
        />
      </View>
    </>
  );
}

const TAMANHO_DO_CANTO = 34;

function Canto({ cor, estilo }: { cor: string; estilo: Record<string, number> }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: TAMANHO_DO_CANTO,
        height: TAMANHO_DO_CANTO,
        borderColor: cor,
        ...estilo,
      }}
    />
  );
}
