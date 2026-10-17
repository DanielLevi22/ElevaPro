import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

const FLAME_SIZE = 14;

/**
 * O topo do perfil no kit (09 · Perfil): a inicial num círculo com a borda da
 * marca, o nome, a linha de contexto e a sequência, quando há.
 *
 * @example <ProfileHero name="João Silva" context="Aluno · Hipertrofia" streakDays={12} />
 */
export function ProfileHero({
  name,
  context,
  streakDays,
}: {
  name: string;
  context: string;
  streakDays: number;
}) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="items-center pt-[1.125rem]">
      <View className="h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full border-[0.1875rem] border-primary bg-hero-chip shadow-lg shadow-primary">
        <Text className="font-display-black text-[2.125rem] text-hero">
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text className="mt-3.5 text-[1.5rem] font-bold tracking-tight text-hero">{name}</Text>
      <Text className="mt-[0.1875rem] text-[0.84375rem] text-hero-secondary">{context}</Text>
      {streakDays > 0 ? (
        <Vidro
          classeExterna="mt-3 rounded-full"
          className="flex-row items-center gap-1.5 px-3.5 py-1.5"
        >
          <Ionicons name="flame" size={escalar(FLAME_SIZE)} color={cores.primary} />
          <Text className="text-[0.8125rem] font-bold text-hero">
            {streakDays === 1 ? '1 dia seguido' : `${streakDays} dias seguidos`}
          </Text>
        </Vidro>
      ) : null}
    </View>
  );
}
