import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * As categorias do catálogo em blocos de vidro, com a escolhida contornada na
 * primária.
 *
 * O kit desenha Vegano, Proteína, Low carb, Snacks e Bebidas. O catálogo não
 * tem dieta nem "snack": tem a categoria nutricional de cada Food. Os blocos
 * são as do catálogo, na mesma forma, e "Ver tudo" abre as nove.
 *
 * @example
 * <CategoriasDoCatalogo escolhida="proteina" todas={false} onEscolher={setCategoria} />
 */
interface Categoria {
  chave: string;
  rotulo: string;
  icone: keyof typeof Ionicons.glyphMap;
}

/** As cinco primeiras aparecem sempre; as outras, com "Ver tudo". */
export const CATEGORIAS: Categoria[] = [
  { chave: 'proteina', rotulo: 'Proteína', icone: 'fish-outline' },
  { chave: 'carboidrato', rotulo: 'Carbos', icone: 'basket-outline' },
  { chave: 'fruta', rotulo: 'Frutas', icone: 'nutrition-outline' },
  { chave: 'hortalica', rotulo: 'Hortaliças', icone: 'leaf-outline' },
  { chave: 'bebida', rotulo: 'Bebidas', icone: 'cafe-outline' },
  { chave: 'laticinio', rotulo: 'Laticínios', icone: 'water-outline' },
  { chave: 'leguminosa', rotulo: 'Grãos', icone: 'ellipse-outline' },
  { chave: 'gordura', rotulo: 'Gorduras', icone: 'flask-outline' },
  { chave: 'suplemento', rotulo: 'Suplementos', icone: 'barbell-outline' },
];

const POR_LINHA = 5;
/** Nomes das vagas vazias de uma linha: a chave não pode ser o índice. */
const VAGAS = ['vaga-1', 'vaga-2', 'vaga-3', 'vaga-4'];
const TAMANHO_DO_ICONE = 19;

interface CategoriasDoCatalogoProps {
  escolhida: string | null;
  todas: boolean;
  /** Tocar na escolhida desfaz a escolha. */
  onEscolher: (categoria: string | null) => void;
}

export function CategoriasDoCatalogo({ escolhida, todas, onEscolher }: CategoriasDoCatalogoProps) {
  const visiveis = todas ? CATEGORIAS : CATEGORIAS.slice(0, POR_LINHA);
  const linhas = Array.from({ length: Math.ceil(visiveis.length / POR_LINHA) }, (_, i) =>
    visiveis.slice(i * POR_LINHA, (i + 1) * POR_LINHA)
  );

  return (
    <View className="gap-2">
      {linhas.map((linha) => (
        <View key={linha[0].chave} className="flex-row gap-2">
          {linha.map((categoria) => (
            <BlocoDaCategoria
              key={categoria.chave}
              categoria={categoria}
              escolhida={categoria.chave === escolhida}
              onPress={() => onEscolher(categoria.chave === escolhida ? null : categoria.chave)}
            />
          ))}
          {/* A última linha incompleta guarda o lugar dos que faltam: sem isso os
              blocos esticavam e a grade perdia a coluna. */}
          {VAGAS.slice(0, POR_LINHA - linha.length).map((vaga) => (
            <View key={vaga} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

interface BlocoDaCategoriaProps {
  categoria: Categoria;
  escolhida: boolean;
  onPress: () => void;
}

function BlocoDaCategoria({ categoria, escolhida, onPress }: BlocoDaCategoriaProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={categoria.rotulo}
      accessibilityState={{ selected: escolhida }}
      className="flex-1"
    >
      <Vidro
        className={cn(
          'items-center gap-[0.4375rem] px-[0.1875rem] py-[0.6875rem]',
          escolhida ? 'border-primary' : null
        )}
      >
        <Ionicons
          name={categoria.icone}
          size={escalar(TAMANHO_DO_ICONE)}
          color={escolhida ? cores.primary : cores.mutedForeground}
        />
        <Text
          numberOfLines={1}
          className={cn(
            'text-center text-[0.59375rem] font-bold',
            escolhida ? 'text-primary-text' : 'text-muted-foreground'
          )}
        >
          {categoria.rotulo}
        </Text>
      </Vidro>
    </TouchableOpacity>
  );
}
