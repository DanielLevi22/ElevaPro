import type { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useBottomOffset } from '@/shared/design';
import { BotaoDeDestaque } from './BotaoDeDestaque';

/**
 * A ação principal fixa acima da tab bar: "Iniciar treino", "Salvar e
 * finalizar", "Compartilhar".
 *
 * O kit a põe a 100 do fundo do telefone. Desses 100, 34 são a área do
 * indicador de início, que aqui é o `inset` do sistema; os outros 66 são a
 * barra (52) e o respiro acima dela (14). A soma é medida, e não classe,
 * porque o `inset` muda de aparelho para aparelho.
 *
 * Mais 22: o "+" central da tab bar, que o kit não desenha, sobressai 16 acima
 * da barra com o brilho dele, e com os 66 do kit o botão encostava nele.
 *
 * @example
 * <TelaDeVidroComFoto bottomSpace="fixedButton" overlay={<BotaoFixoNoRodape rotulo="Iniciar treino" icone="play" onPress={iniciar} />} />
 */
interface BotaoFixoNoRodapeProps {
  rotulo: string;
  icone?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}

/** O indicador (34), a tab bar do kit (52), o respiro (14) e o que o "+" sobressai (22). */
const DO_FUNDO = 122;

export function BotaoFixoNoRodape({ rotulo, icone, onPress, disabled }: BotaoFixoNoRodapeProps) {
  const bottom = useBottomOffset(DO_FUNDO);

  return (
    <View className="absolute left-[1.125rem] right-[1.125rem]" style={{ bottom }}>
      <BotaoDeDestaque rotulo={rotulo} icone={icone} onPress={onPress} disabled={disabled} />
    </View>
  );
}

export type { BotaoFixoNoRodapeProps };
