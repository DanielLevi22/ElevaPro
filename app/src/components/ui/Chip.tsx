import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * Etiqueta do kit de vidro: "Treino B", "Costas", "Sugerido para hoje".
 *
 * Não é o `Badge`, e não por gosto. O `Badge` é pílula de **estado** com ponto
 * colorido, tingida a 15%; o chip do kit é **etiqueta** — sólido na primária
 * quando destaca, vidro forte quando só informa, em caixa alta e peso 800. Uma
 * variante do `Badge` carregaria dois vocabulários no mesmo componente.
 *
 * @example
 * <Chip tom="destaque">Próximo</Chip>
 * <Chip icone="repeat">4 × 8-10</Chip>
 */
interface ChipProps {
  children: string;
  tom?: 'destaque' | 'neutro';
  icone?: keyof typeof Ionicons.glyphMap;
}

const FUNDO = { destaque: 'bg-primary', neutro: 'bg-glass-strong' } as const;
const TEXTO = { destaque: 'text-primary-foreground', neutro: 'text-muted-foreground' } as const;

const TAMANHO_DO_ICONE = 12;

export function Chip({ children, tom = 'neutro', icone }: ChipProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View
      className={cn('flex-row items-center gap-[0.3125rem] rounded-full px-2.5 py-1', FUNDO[tom])}
    >
      {icone ? (
        <Ionicons name={icone} size={escalar(TAMANHO_DO_ICONE)} color={cores.placeholder} />
      ) : null}
      <Text className={cn('text-[0.65625rem] font-extrabold uppercase tracking-wider', TEXTO[tom])}>
        {children}
      </Text>
    </View>
  );
}

export type { ChipProps };
