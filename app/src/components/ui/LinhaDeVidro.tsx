import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useCores, useEscala } from '@/shared/design';
import { CaixaDeIcone, type TomDeMetrica } from './CaixaDeIcone';
import { Vidro } from './Vidro';

/**
 * Linha de vidro: ícone tingido, título, subtítulo e a seta — ou o que o call
 * site puser à direita.
 *
 * É a `Row` do kit de vidro. Difere da `Row` chapada em mais que superfície: lá
 * a linha vive dentro de um `Group` que dá moldura e separador, aqui cada linha
 * é seu próprio cartão. Por isso são dois componentes e não um com variante —
 * o que muda é a estrutura, não a pintura.
 *
 * @example
 * <LinhaDeVidro icon="restaurant" tom="proteina" titulo="Dieta & Macros"
 *   sub="2 de 4 refeições registradas" direita={<Text>50%</Text>} />
 */
interface LinhaDeVidroProps {
  icon: keyof typeof Ionicons.glyphMap;
  tom: TomDeMetrica;
  titulo: string;
  sub?: string;
  /** Substitui a seta. O kit usa isso para mostrar o percentual da dieta. */
  direita?: ReactNode;
  onPress?: () => void;
}

const TAMANHO_DA_SETA = 17;

export function LinhaDeVidro({ icon, tom, titulo, sub, direita, onPress }: LinhaDeVidroProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      className="mb-2.5"
    >
      <Vidro className="flex-row items-center gap-[0.8125rem] p-3.5">
        <CaixaDeIcone icon={icon} tom={tom} tamanho="linha" />

        <View className="min-w-0 flex-1">
          <Text className="text-rotulo font-semibold tracking-tight text-foreground">{titulo}</Text>
          {sub ? <Text className="mt-px text-micro text-muted-foreground">{sub}</Text> : null}
        </View>

        {direita ?? (
          <Ionicons
            name="chevron-forward"
            size={escalar(TAMANHO_DA_SETA)}
            color={cores.placeholder}
          />
        )}
      </Vidro>
    </TouchableOpacity>
  );
}

export type { LinhaDeVidroProps };
