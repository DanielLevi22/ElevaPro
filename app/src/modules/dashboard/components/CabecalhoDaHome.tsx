import type { ProfileSummary, StudentStreak } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { AvatarDoCabecalho } from '@/components/ui/AvatarDoCabecalho';
import { useCores, useEscala } from '@/shared/design';
import { getLocalDateISOString } from '@/utils/dateUtils';

/**
 * Data, saudação, ofensiva e avatar, sobre a foto.
 *
 * O floco ao lado da ofensiva é o que a home anterior mostrava quando o aluno
 * tem congelamento guardado. O kit não o desenha, e a reescrita o tinha perdido
 * sem decisão: é informação de produto — diz que perder um dia não zera a
 * sequência — e não enfeite.
 *
 * @example
 * <CabecalhoDaHome perfil={perfil} ofensiva={ofensiva} streakDays={12} />
 */
interface CabecalhoDaHomeProps {
  perfil: ProfileSummary | null;
  /** Só o congelamento sai daqui. */
  ofensiva: StudentStreak | null;
  /** Os dias seguidos, calculados da activity (#312). */
  streakDays: number;
}

const TAMANHO_DO_FLOCO = 11;

export function CabecalhoDaHome({ perfil, ofensiva, streakDays }: CabecalhoDaHomeProps) {
  const cores = useCores();
  const escalar = useEscala();
  const congelamentos = ofensiva?.freeze_available ?? 0;

  return (
    <View className="flex-row items-center justify-between">
      <View className="min-w-0 flex-1">
        <Text className="text-legenda font-semibold text-hero-secondary">{hoje()}</Text>
        <Text className="mt-0.5 text-h1 font-bold tracking-tight text-hero">
          Olá, {perfil?.full_name?.split(' ')[0] || 'Aluno'}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {congelamentos > 0 ? (
          <View
            accessibilityLabel={`${congelamentos} congelamentos de ofensiva disponíveis`}
            className="rounded-full bg-secondary/20 p-1.5"
          >
            <Ionicons name="snow" size={escalar(TAMANHO_DO_FLOCO)} color={cores.secondary} />
          </View>
        ) : null}
        <StreakCounter
          streak={streakDays}
          // Data local, e não `toISOString()`: em UTC, depois das 21h em
          // Brasília a comparação já olhava para amanhã.
          frozen={ofensiva?.last_freeze_date === getLocalDateISOString()}
        />
        <AvatarDoCabecalho profile={perfil} />
      </View>
    </View>
  );
}

function hoje(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}
