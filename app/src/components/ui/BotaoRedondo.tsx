import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useCores, useEscala } from '@/shared/design';

/**
 * O botão redondo de vidro que o kit põe sobre a foto: voltar, fechar, voz.
 *
 * Usa a superfície de chip de hero, e não o `Vidro`: sobre fotografia o kit
 * troca o preenchimento pelo `hero-chip`, que funciona nos dois temas. O
 * `IconButton` antigo continua na paleta anterior e sai com as telas dele.
 *
 * @example
 * <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={router.back} />
 */
interface BotaoRedondoProps {
  icone: keyof typeof Ionicons.glyphMap;
  /** Obrigatório: sem texto, o leitor de tela só anunciaria "botão". */
  rotulo: string;
  onPress: () => void;
}

const LADO = 38;
/** O kit dimensiona o ícone pelo botão: 47% do lado. */
const FRACAO_DO_ICONE = 0.47;

export function BotaoRedondo({ icone, rotulo, onPress }: BotaoRedondoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      className="h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-full border border-hero-chip-border bg-hero-chip"
    >
      <Ionicons name={icone} size={escalar(LADO * FRACAO_DO_ICONE)} color={cores.onHero} />
    </TouchableOpacity>
  );
}

export type { BotaoRedondoProps };
