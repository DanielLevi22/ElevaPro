import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { Vidro } from './Vidro';

/**
 * O campo de busca em vidro: a lupa e o texto dentro de uma pílula de 48.
 *
 *     glass, altura 48, raio 24, padding 14, gap 9; lupa 17 e placeholder em label3
 *
 * Nasceu na busca de alimento (#298) e virou primitiva na segunda tela que o
 * desenhou, a evolução de cargas (#312).
 *
 * @example <GlassSearchField value={query} onChangeText={setQuery} placeholder="Buscar exercício…" />
 */
interface GlassSearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
}

const ICON_SIZE = 17;

export function GlassSearchField({
  value,
  onChangeText,
  placeholder,
  className,
  autoFocus,
}: GlassSearchFieldProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro
      classeExterna={cn('rounded-2xl', className)}
      className="h-12 flex-row items-center gap-[0.5625rem] rounded-2xl px-3.5"
    >
      <Ionicons name="search" size={escalar(ICON_SIZE)} color={cores.placeholder} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={cores.placeholder}
        returnKeyType="search"
        accessibilityLabel={placeholder.replace('…', '')}
        autoFocus={autoFocus}
        className="flex-1 text-[0.84375rem] text-foreground"
      />
    </Vidro>
  );
}
