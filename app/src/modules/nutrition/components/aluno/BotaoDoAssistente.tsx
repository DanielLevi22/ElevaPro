import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrilho, useCores, useEscala } from '@/shared/design';

/**
 * O botão redondo do assistente, flutuando no canto acima da tab bar.
 *
 * O kit o põe a 104 do fundo do telefone: 34 da área do indicador de início,
 * que aqui é o `inset` do sistema, 52 da tab bar e 18 de respiro. Fica no
 * canto, e não precisa dos 22 que o `BotaoFixoNoRodape` sobe por causa do "+"
 * central.
 *
 * @example
 * <BotaoDoAssistente onPress={() => router.push(ROUTES.NUTRITION.ASSISTANT)} />
 */
const ACIMA_DO_INSET = 70;
const LADO = 58;
const TAMANHO_DO_ICONE = 25;
/** `0 14px 34px -8px` da primária. */
const BRILHO = { y: 14, blur: 34, espalhamento: -8 } as const;

export function BotaoDoAssistente({ onPress }: { onPress: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Falar com o assistente de nutrição"
      className="absolute right-[1.125rem] items-center justify-center rounded-full bg-primary"
      style={{
        bottom: insets.bottom + escalar(ACIMA_DO_INSET),
        width: escalar(LADO),
        height: escalar(LADO),
        boxShadow: brilho(BRILHO),
      }}
    >
      <Ionicons name="sparkles" size={escalar(TAMANHO_DO_ICONE)} color={cores.primaryForeground} />
    </TouchableOpacity>
  );
}
