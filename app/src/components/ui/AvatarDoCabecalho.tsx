import { useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';

/**
 * O avatar do cabeçalho da Home, com o pontinho de presença.
 *
 * Era uma função declarada dentro de `(tabs)/index.tsx` e usada pelos dois
 * painéis — do aluno e do especialista. Ao separar os painéis em arquivos, ela
 * precisava virar componente ou virar duas cópias.
 */
interface AvatarDoCabecalhoProps {
  profile: { full_name?: string | null; avatar_url?: string | null } | null;
}

export function AvatarDoCabecalho({ profile }: AvatarDoCabecalhoProps) {
  const cores = useCores();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(ROUTES.TABS.PROFILE)}
      activeOpacity={0.8}
      className="items-center justify-center p-0.5"
    >
      <View
        className="w-12 h-12 rounded-full border-2 overflow-hidden items-center justify-center bg-card shadow-sm"
        style={{ borderColor: cores.border }}
      >
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-muted">
            <Text className="text-primary-text font-bold text-lg font-display">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
      </View>
      <View
        className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background"
        style={{ backgroundColor: cores.success }}
      />
    </TouchableOpacity>
  );
}
