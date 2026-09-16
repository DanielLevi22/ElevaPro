import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';

/**
 * Os cartões de vidro da tela do ranking que não são o placar: o prazo, o
 * convite, e o recado quando não há placar para mostrar.
 */

/** "Encerra em 2 dias e 14 horas", com o relógio no âmbar do kit. */
export function DeadlineCard({ label }: { label: string }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <Vidro classeExterna="mt-[1.125rem]" className="flex-row items-center gap-2.5 px-4 py-3.5">
      <Ionicons name="time-outline" size={escalar(16)} color={cores.metricaGordura} />
      <Text className="text-[0.84375rem] font-semibold text-foreground">{label}</Text>
    </Vidro>
  );
}

/**
 * O convite no lugar do placar, para quem ainda não entrou.
 *
 * O texto diz exatamente o que o aceite autoriza (Art. 9°): o que aparece, para
 * quem, e que dá para sair.
 */
export function RankingInvite({ onJoin, busy }: { onJoin: () => void; busy: boolean }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <Vidro classeExterna="mt-[1.625rem]" className="items-center gap-3 p-5">
      <MaterialCommunityIcons name="trophy-outline" size={escalar(34)} color={cores.primary} />
      <Text className="text-center text-h2 font-bold tracking-tight text-foreground">
        Participe do ranking
      </Text>
      <Text className="text-center text-legenda text-muted-foreground">
        Seu primeiro nome e a inicial do sobrenome aparecem para outros participantes, com seus
        pontos da semana. Você pode sair quando quiser.
      </Text>
      <View className="mt-1 w-full" pointerEvents={busy ? 'none' : 'auto'}>
        <BotaoDeDestaque
          rotulo={busy ? 'Entrando…' : 'Participar'}
          onPress={onJoin}
          tamanho="cartao"
        />
      </View>
    </Vidro>
  );
}

/** Placar vazio ou falho, com o que fazer em cada caso. */
export function LeaderboardNotice({
  failed,
  isSpecialist,
  onRetry,
}: {
  failed: boolean;
  isSpecialist: boolean;
  onRetry: () => void;
}) {
  const empty = isSpecialist
    ? 'Nenhum aluno pontuou esta semana.'
    : 'Ninguém pontuou esta semana. Conclua um treino para abrir o placar.';
  return (
    <Vidro classeExterna="mt-[1.625rem]" className="items-center gap-3 p-5">
      <Text className="text-center text-legenda text-muted-foreground">
        {failed ? 'Não consegui carregar o placar.' : empty}
      </Text>
      {failed ? (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button">
          <Text className="text-[0.875rem] font-semibold text-primary-text">Tentar de novo</Text>
        </TouchableOpacity>
      ) : null}
    </Vidro>
  );
}
