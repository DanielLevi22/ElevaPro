import { Image, Text, View } from 'react-native';
import { cn } from '@/lib/utils';

/**
 * Foto de perfil, ou as iniciais quando não há foto.
 *
 * O ponto de presença fica fora do recorte circular, encostado na borda — por
 * isso o contêiner não tem `overflow-hidden` e quem recorta é a própria imagem.
 *
 * @example
 * <Avatar name="Ana Paula" size="lg" online />
 */
interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

const CAIXA = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' } as const;
const TEXTO = { sm: 'text-micro', md: 'text-legenda', lg: 'text-rotulo' } as const;
const PONTO = { sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-3.5 w-3.5' } as const;

/**
 * Duas iniciais no máximo, do primeiro e do último nome — "Ana Paula Silva"
 * vira "AS", e não "AP".
 */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase();
}

export function Avatar({ name, src, size = 'md', online = false }: AvatarProps) {
  return (
    <View className={cn('relative items-center justify-center rounded-full bg-muted', CAIXA[size])}>
      {src ? (
        <Image
          source={{ uri: src }}
          accessibilityLabel={name}
          className={cn('rounded-full', CAIXA[size])}
        />
      ) : (
        <Text className={cn('font-semibold text-foreground', TEXTO[size])}>
          {iniciais(name ?? '')}
        </Text>
      )}

      {online ? (
        <View
          accessibilityLabel="online"
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background bg-success',
            PONTO[size]
          )}
        />
      ) : null}
    </View>
  );
}

export type { AvatarProps };
