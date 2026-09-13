import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity } from 'react-native';
import { cn } from '@/lib/utils';
import { comOpacidade, useCores, useEscala } from '@/shared/design';

/**
 * A ação principal do kit de vidro: lime, caixa alta, com brilho da própria cor.
 *
 * Não é o `Button` da #281. Aquele é o botão chapado das telas iOS — peso 600,
 * sem brilho. Este é o do fluxo de vidro: peso 800, letras espaçadas e a
 * sombra lime que o kit reserva a ele. Brilho em todo botão seria ruído; é
 * isso que o torna o único destaque da tela.
 *
 * `cartao` é o botão dentro do cartão do treino (46 de altura); `fixo`, o que
 * flutua acima da tab bar (54); `compacto`, o "Check" ao lado da barra de
 * séries, que cabe no próprio texto; `grande`, o "Iniciar treino" do
 * pré-início (62), em letra de display.
 *
 * @example
 * <BotaoDeDestaque rotulo="Começar treino" icone="play" onPress={comecar} />
 */
interface BotaoDeDestaqueProps {
  rotulo: string;
  onPress: () => void;
  icone?: keyof typeof Ionicons.glyphMap;
  tamanho?: 'cartao' | 'fixo' | 'compacto' | 'grande';
}

const FORMA = {
  cartao: 'h-[2.875rem] rounded-[0.9375rem]',
  fixo: 'h-[3.375rem] rounded-[1.125rem]',
  compacto: 'h-[2.875rem] rounded-[0.875rem] px-6',
  grande: 'h-[3.875rem] rounded-[1.375rem] gap-2.5',
} as const;

const TEXTO = {
  cartao: 'text-[0.84375rem]',
  fixo: 'text-[0.90625rem]',
  compacto: 'text-[0.78125rem]',
  grande: 'font-display-black text-[1.0625rem] tracking-[0.14em]',
} as const;

/** O brilho do kit: `0 10px 26px -8px` no cartão e `0 10px 30px -8px` a 70% no fixo. */
const BRILHO = {
  cartao: { y: 10, blur: 26, espalhamento: -8, alfa: 1 },
  fixo: { y: 10, blur: 30, espalhamento: -8, alfa: 0.7 },
  compacto: { y: 10, blur: 26, espalhamento: -10, alfa: 1 },
  grande: { y: 14, blur: 40, espalhamento: -10, alfa: 1 },
} as const;

const TAMANHO_DO_ICONE = { cartao: 17, fixo: 17, compacto: 16, grande: 22 } as const;

export function BotaoDeDestaque({
  rotulo,
  onPress,
  icone,
  tamanho = 'fixo',
}: BotaoDeDestaqueProps) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = BRILHO[tamanho];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      className={cn('flex-row items-center justify-center gap-2 bg-primary', FORMA[tamanho])}
      style={{
        boxShadow: [
          {
            offsetX: 0,
            offsetY: escalar(brilho.y),
            blurRadius: escalar(brilho.blur),
            spreadDistance: escalar(brilho.espalhamento),
            color: comOpacidade(cores.primary, brilho.alfa),
          },
        ],
      }}
    >
      {icone ? (
        <Ionicons
          name={icone}
          size={escalar(TAMANHO_DO_ICONE[tamanho])}
          color={cores.primaryForeground}
        />
      ) : null}
      <Text
        className={cn(
          'font-extrabold uppercase tracking-widest text-primary-foreground',
          TEXTO[tamanho]
        )}
      >
        {rotulo}
      </Text>
    </TouchableOpacity>
  );
}

export type { BotaoDeDestaqueProps };
