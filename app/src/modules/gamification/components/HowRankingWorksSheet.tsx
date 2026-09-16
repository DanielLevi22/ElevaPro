import { Text, View } from 'react-native';
import { Bullet } from '@/components/ui/Bullet';
import { GlassSheet } from '@/components/ui/GlassSheet';
import type { RankingViewer } from '../types';

/**
 * "Como funciona" do ranking: como se ganha ponto, quando a semana fecha, o que
 * os outros veem, e a saída.
 *
 * A regra escrita aqui é a da `ranking_points_for_day` (migration 0059). Mudar
 * uma sem a outra é prometer ao usuário um placar que não existe.
 *
 * @example <HowRankingWorksSheet visible viewer={viewer} onClose={close} />
 */
interface HowRankingWorksSheetProps {
  visible: boolean;
  onClose: () => void;
  viewer: RankingViewer;
}

const RULES = [
  'Cada treino concluído vale 100 pontos, até 2 treinos por dia.',
  'A semana vai de segunda a domingo, no horário de Brasília, e o placar recomeça toda segunda.',
  'Refeições, água e medidas não contam pontos.',
  'O número à direita de cada linha mostra quantas posições a pessoa andou desde a semana passada.',
];

const VISIBILITY_NOTE = {
  in: 'Outros participantes veem seu primeiro nome, a inicial do sobrenome e seus pontos. Ao sair, seu nome some do placar na hora.',
  out: 'Só quem participa vê o placar, e vê seu primeiro nome, a inicial do sobrenome e seus pontos.',
} as const;

export function HowRankingWorksSheet({ visible, onClose, viewer }: HowRankingWorksSheetProps) {
  const actions = sheetActions(viewer, onClose);
  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      busy={viewer.kind === 'participant' && viewer.busy}
      primary={actions.primary}
      secondary={actions.secondary}
      footnote={actions.footnote}
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

interface SheetActions {
  primary: { label: string; onPress: () => void };
  secondary: { label: string; onPress: () => void };
  footnote?: string;
}

/** As ações da folha: entrar para quem está fora, sair para quem está dentro. */
function sheetActions(viewer: RankingViewer, onClose: () => void): SheetActions {
  const understood = { label: 'Entendi', onPress: onClose };
  if (viewer.kind === 'specialist') {
    return { primary: understood, secondary: { label: 'Fechar', onPress: onClose } };
  }
  const closeAfter = (action: () => Promise<void>) => async () => {
    await action();
    onClose();
  };
  if (viewer.participation === 'in') {
    const leave = { label: 'Sair do ranking', onPress: closeAfter(viewer.leave) };
    return { primary: understood, secondary: leave, footnote: VISIBILITY_NOTE.in };
  }
  const join = { label: 'Participar', onPress: closeAfter(viewer.join) };
  const later = { label: 'Agora não', onPress: onClose };
  return { primary: join, secondary: later, footnote: VISIBILITY_NOTE.out };
}
