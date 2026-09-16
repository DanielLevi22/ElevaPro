import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import type { RankingViewer } from '../types';

/**
 * Os cartões de vidro da tela do ranking que não são o placar: o prazo, o
 * convite, e o recado quando não há placar para mostrar.
 */

/** "Encerra em 2 dias e 14 horas", com o relógio no tom de atenção. */
export function DeadlineCard({ label }: { label: string }) {
  const colors = useCores();
  const scale = useEscala();
  return (
    <Vidro classeExterna="mt-[1.125rem]" className="flex-row items-center gap-2.5 px-4 py-3.5">
      <Ionicons name="time-outline" size={scale(16)} color={colors.warning} />
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
  const colors = useCores();
  const scale = useEscala();
  return (
    <Vidro classeExterna="mt-[1.625rem]" className="items-center gap-3 p-5">
      <MaterialCommunityIcons name="trophy-outline" size={scale(34)} color={colors.primary} />
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

const EMPTY_TEXT: Record<RankingViewer['kind'], string> = {
  specialist: 'Nenhum aluno pontuou esta semana.',
  participant: 'Ninguém pontuou esta semana. Conclua um treino para abrir o placar.',
};

interface LeaderboardNoticeProps {
  failed: boolean;
  emptyFor: RankingViewer['kind'];
  onRetry: () => void;
}

/** Placar vazio ou falho, com o que fazer em cada caso. */
export function LeaderboardNotice({ failed, emptyFor, onRetry }: LeaderboardNoticeProps) {
  return (
    <Vidro classeExterna="mt-[1.625rem]" className="items-center gap-3 p-5">
      <Text className="text-center text-legenda text-muted-foreground">
        {failed ? 'Não consegui carregar o placar.' : EMPTY_TEXT[emptyFor]}
      </Text>
      {failed ? (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button">
          <Text className="text-[0.875rem] font-semibold text-primary-text">Tentar de novo</Text>
        </TouchableOpacity>
      ) : null}
    </Vidro>
  );
}
