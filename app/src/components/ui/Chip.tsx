import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { cn } from '@/lib/utils';
import { type Cores, comOpacidade, useCores, useEscala } from '@/shared/design';

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
 * <Chip tom="evolucao" icone="trending-up">+2,5 kg</Chip>
 */
interface ChipProps {
  children: string;
  /**
   * `evolucao` é o selo verde do kit: carga que subiu desde a última vez.
   * `sobreImagem` é o chip sobre foto com véu: branco a 16%, igual nos dois
   * temas — o `neutro` some sobre a foto escura no tema claro.
   */
  tom?: 'destaque' | 'neutro' | 'evolucao' | 'sobreImagem';
  icone?: keyof typeof Ionicons.glyphMap;
}

const FUNDO = {
  destaque: 'bg-primary',
  neutro: 'bg-glass-strong',
  evolucao: 'bg-metrica-passos/20',
  // O branco a 16% vai em `style`: o token é literal e não aceita `/16`.
  sobreImagem: null,
} as const;
const TEXTO = {
  destaque: 'text-primary-foreground',
  neutro: 'text-muted-foreground',
  evolucao: 'text-metrica-passos',
  sobreImagem: 'text-sobre-imagem',
} as const;

const FUNDO_SOBRE_IMAGEM = 0.16;

const TAMANHO_DO_ICONE = 12;

const COR_DO_ICONE: Record<NonNullable<ChipProps['tom']>, (cores: Cores) => string> = {
  destaque: (cores) => cores.primaryForeground,
  neutro: (cores) => cores.placeholder,
  evolucao: (cores) => cores.metricaPassos,
  sobreImagem: (cores) => cores.sobreImagemSecundario,
};

export function Chip({ children, tom = 'neutro', icone }: ChipProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View
      className={cn('flex-row items-center gap-[0.3125rem] rounded-full px-2.5 py-1', FUNDO[tom])}
      style={
        tom === 'sobreImagem'
          ? { backgroundColor: comOpacidade(cores.sobreImagem, FUNDO_SOBRE_IMAGEM) }
          : undefined
      }
    >
      {icone ? (
        <Ionicons name={icone} size={escalar(TAMANHO_DO_ICONE)} color={COR_DO_ICONE[tom](cores)} />
      ) : null}
      <Text className={cn('text-[0.65625rem] font-extrabold uppercase tracking-wider', TEXTO[tom])}>
        {children}
      </Text>
    </View>
  );
}

export type { ChipProps };
