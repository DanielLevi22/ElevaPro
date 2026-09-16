import { Text, View } from 'react-native';
import { Bullet } from '@/components/ui/Bullet';
import { GlassSheet } from '@/components/ui/GlassSheet';
import type { RankingParticipation } from '../hooks/useRankingConsent';

/**
 * "Como funciona" do ranking: como se ganha ponto, quando a semana fecha, o que
 * os outros veem, e a saída.
 *
 * A regra escrita aqui é a da `ranking_points_for_day` (migration 0059). Mudar
 * uma sem a outra é prometer ao usuário um placar que não existe.
 *
 * @example <HowRankingWorksSheet visible participation="in" onLeave={leave} … />
 */
interface HowRankingWorksSheetProps {
  visible: boolean;
  onClose: () => void;
  /** `null` para o especialista, que não participa do placar global. */
  participation: RankingParticipation | null;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

const RULES = [
  'Cada treino concluído vale 100 pontos, até 2 treinos por dia.',
  'A semana vai de segunda a domingo, no horário de Brasília, e o placar recomeça toda segunda.',
  'Refeições, água e medidas não contam pontos.',
  'O número à direita de cada linha mostra quantas posições a pessoa andou desde a semana passada.',
];

export function HowRankingWorksSheet({
  visible,
  onClose,
  participation,
  busy,
  onJoin,
  onLeave,
}: HowRankingWorksSheetProps) {
  const participating = participation === 'in';
  const canJoin = participation === 'out';

  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      busy={busy}
      primary={
        canJoin ? { label: 'Participar', onPress: onJoin } : { label: 'Entendi', onPress: onClose }
      }
      secondary={
        participating
          ? { label: 'Sair do ranking', onPress: onLeave }
          : { label: canJoin ? 'Agora não' : 'Fechar', onPress: onClose }
      }
      footnote={participation === null ? undefined : visibilityNote(participating)}
    >
      <Text className="mb-3 text-h2 font-bold tracking-tight text-foreground">Como funciona</Text>
      <View className="gap-2.5">
        {RULES.map((rule) => (
          <Bullet key={rule}>{rule}</Bullet>
        ))}
      </View>
    </GlassSheet>
  );
}

function visibilityNote(participating: boolean): string {
  return participating
    ? 'Outros participantes veem seu primeiro nome, a inicial do sobrenome e seus pontos. Ao sair, seu nome some do placar na hora.'
    : 'Só quem participa vê o placar, e vê seu primeiro nome, a inicial do sobrenome e seus pontos.';
}
